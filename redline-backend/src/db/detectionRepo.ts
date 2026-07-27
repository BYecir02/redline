/**
 * Adaptateur de PERSISTANCE des détections (Prisma/Postgres).
 * Traduit un rapport d'analyse (moteur stateless) en écritures de cycle de vie :
 * projets, détections (identité par signature) et journal d'événements horodaté.
 * La logique de diff est déléguée à `reconcile.ts` (pure, testée sans DB).
 */
import { prisma } from "./client.js";
import {
  planReconciliation,
  signatureOf,
  type DetectionStatus,
} from "./reconcile.js";
import type { ScanReport } from "../types/report.js";

/** Retrouve (ou crée) le projet d'un utilisateur pour un chemin donné. */
export async function getOrCreateProject(
  userId: string,
  path: string,
  label?: string,
): Promise<{ id: string }> {
  return prisma.project.upsert({
    where: { userId_path: { userId, path } },
    update: {},
    create: { userId, path, label },
    select: { id: true },
  });
}

/** Données d'un problème nécessaires à la création d'une détection. */
type IssueData = {
  skillId: string;
  category: string;
  severity: string;
  line: number;
  snippet: string;
};

/**
 * Réconcilie en base les détections d'UN fichier avec son nouveau rapport :
 * crée les nouveaux problèmes, rouvre ceux qui réapparaissent, rafraîchit ceux
 * toujours présents, et résout ceux qui ont disparu — le tout en une transaction,
 * avec un événement horodaté par transition (pour les tendances).
 */
export async function reconcileFileReport(
  projectId: string,
  report: ScanReport,
): Promise<void> {
  const file = report.filename;

  // Signature -> données du problème (dédoublonné sur la signature).
  const incoming = new Map<string, IssueData>();
  for (const issue of report.issues) {
    const sig = signatureOf(file, issue.skillId, issue.before);
    if (!incoming.has(sig)) {
      incoming.set(sig, {
        skillId: issue.skillId,
        category: issue.category,
        severity: issue.severity,
        line: issue.line,
        snippet: issue.before,
      });
    }
  }

  const existing = await prisma.detection.findMany({
    where: { projectId, file },
    select: { id: true, signature: true, status: true, skillId: true, severity: true },
  });
  const existingById = new Map(existing.map((d) => [d.id, d]));

  const plan = planReconciliation(
    existing.map((d) => ({
      id: d.id,
      signature: d.signature,
      status: d.status as DetectionStatus,
    })),
    [...incoming.keys()],
  );

  if (
    plan.create.length === 0 &&
    plan.reopen.length === 0 &&
    plan.touch.length === 0 &&
    plan.resolve.length === 0
  ) {
    return;
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    // Nouveaux problèmes → détection ACTIVE + événement APPEARED.
    for (const sig of plan.create) {
      const d = incoming.get(sig)!;
      const created = await tx.detection.create({
        data: {
          projectId,
          file,
          signature: sig,
          skillId: d.skillId,
          category: d.category,
          severity: d.severity,
          line: d.line,
          snippet: d.snippet,
        },
        select: { id: true },
      });
      await tx.detectionEvent.create({
        data: { projectId, detectionId: created.id, type: "APPEARED", skillId: d.skillId, severity: d.severity },
      });
    }

    // Réapparitions → repasse ACTIVE + événement REOPENED.
    for (const id of plan.reopen) {
      const prev = existingById.get(id)!;
      await tx.detection.update({
        where: { id },
        data: { status: "ACTIVE", resolvedAt: null, lastSeenAt: now, reopenCount: { increment: 1 } },
      });
      await tx.detectionEvent.create({
        data: { projectId, detectionId: id, type: "REOPENED", skillId: prev.skillId, severity: prev.severity },
      });
    }

    // Toujours présents → simple rafraîchissement (pas d'événement).
    if (plan.touch.length > 0) {
      await tx.detection.updateMany({ where: { id: { in: plan.touch } }, data: { lastSeenAt: now } });
    }

    // Disparus → RESOLVED + événement RESOLVED.
    for (const id of plan.resolve) {
      const prev = existingById.get(id)!;
      await tx.detection.update({
        where: { id },
        data: { status: "RESOLVED", resolvedAt: now },
      });
      await tx.detectionEvent.create({
        data: { projectId, detectionId: id, type: "RESOLVED", skillId: prev.skillId, severity: prev.severity },
      });
    }
  });
}

/**
 * Résout toutes les détections ACTIVE d'un fichier supprimé du disque :
 * le problème n'est plus présent dans le code → on ferme son cycle de vie.
 */
export async function resolveFileDetections(projectId: string, file: string): Promise<void> {
  const active = await prisma.detection.findMany({
    where: { projectId, file, status: "ACTIVE" },
    select: { id: true, skillId: true, severity: true },
  });
  if (active.length === 0) return;

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    for (const d of active) {
      await tx.detection.update({ where: { id: d.id }, data: { status: "RESOLVED", resolvedAt: now } });
      await tx.detectionEvent.create({
        data: { projectId, detectionId: d.id, type: "RESOLVED", skillId: d.skillId, severity: d.severity },
      });
    }
  });
}

// --- Adaptateur de haut niveau branché sur le watcher --------------------

/** Persiste le résultat d'un scan de fichier sous le projet (userId + chemin). */
export async function persistScan(
  userId: string,
  projectPath: string,
  report: ScanReport,
): Promise<void> {
  const { id } = await getOrCreateProject(userId, projectPath);
  await reconcileFileReport(id, report);
}

/** Persiste la suppression d'un fichier (résout ses détections actives). */
export async function persistRemoval(
  userId: string,
  projectPath: string,
  file: string,
): Promise<void> {
  const { id } = await getOrCreateProject(userId, projectPath);
  await resolveFileDetections(id, file);
}
