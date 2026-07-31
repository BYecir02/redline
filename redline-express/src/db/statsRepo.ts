/**
 * Agrégations analytiques (lecture seule), toutes scopées par utilisateur.
 * Mélange `groupBy` Prisma (comptes par dimension) et SQL brut paramétré
 * (MTTR, tendances horodatées via date_trunc) — jamais de concaténation d'entrée
 * utilisateur dans le SQL (tout passe en paramètres liés).
 */
import { Prisma } from "@prisma/client";
import { prisma } from "./client.js";
import { foldTrendRows, type TrendEventRow, type TrendPoint } from "./statsShape.js";

export type StatusSplit = { active: number; resolved: number };

export type Summary = {
  totals: { active: number; resolved: number; detections: number; events: number };
  bySeverity: ({ severity: string } & StatusSplit)[];
  byCategory: ({ category: string } & StatusSplit)[];
  topSkills: ({ skillId: string; total: number } & StatusSplit)[];
  /** Temps moyen de résolution en secondes (resolvedAt − firstSeenAt), ou null. */
  mttrSeconds: number | null;
  /** Nombre de détections ayant déjà rouvert au moins une fois. */
  reopenedCount: number;
};

/** Filtre relationnel commun : les données de cet utilisateur (option : un projet). */
function ownedBy(userId: string, projectPath?: string) {
  return { project: { userId, ...(projectPath ? { path: projectPath } : {}) } };
}

/** Fusionne des lignes (dimension × statut) en { dimension, active, resolved }. */
function splitByStatus<K extends string>(
  rows: { dim: string; status: string; count: number }[],
  key: K,
): ({ [P in K]: string } & StatusSplit)[] {
  const map = new Map<string, StatusSplit>();
  for (const r of rows) {
    const cur = map.get(r.dim) ?? { active: 0, resolved: 0 };
    if (r.status === "ACTIVE") cur.active += r.count;
    else if (r.status === "RESOLVED") cur.resolved += r.count;
    map.set(r.dim, cur);
  }
  return [...map.entries()].map(([dim, s]) => ({ [key]: dim, ...s }) as { [P in K]: string } & StatusSplit);
}

export async function getSummary(userId: string, projectPath?: string): Promise<Summary> {
  const where = ownedBy(userId, projectPath);
  // Détections : on exclut les ignorées des stats « actuelles » (cohérent avec l'UI).
  const detWhere = { ...where, ignored: false };
  // Fragment SQL conditionnel pour scoper le brut (MTTR) à un projet donné.
  const pathFilter = projectPath ? Prisma.sql`AND p."path" = ${projectPath}` : Prisma.empty;

  const [active, resolved, events, sevRows, catRows, skillRows, reopenedCount] = await Promise.all([
    prisma.detection.count({ where: { ...detWhere, status: "ACTIVE" } }),
    prisma.detection.count({ where: { ...detWhere, status: "RESOLVED" } }),
    prisma.detectionEvent.count({ where }),
    prisma.detection.groupBy({ by: ["severity", "status"], where: detWhere, _count: { _all: true } }),
    prisma.detection.groupBy({ by: ["category", "status"], where: detWhere, _count: { _all: true } }),
    prisma.detection.groupBy({ by: ["skillId", "status"], where: detWhere, _count: { _all: true } }),
    prisma.detection.count({ where: { ...detWhere, reopenCount: { gt: 0 } } }),
  ]);

  const bySeverity = splitByStatus(
    sevRows.map((r) => ({ dim: r.severity, status: r.status, count: r._count._all })),
    "severity",
  );
  const byCategory = splitByStatus(
    catRows.map((r) => ({ dim: r.category, status: r.status, count: r._count._all })),
    "category",
  );
  const skillsSplit = splitByStatus(
    skillRows.map((r) => ({ dim: r.skillId, status: r.status, count: r._count._all })),
    "skillId",
  );
  const topSkills = skillsSplit
    .map((s) => ({ skillId: s.skillId, active: s.active, resolved: s.resolved, total: s.active + s.resolved }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  // MTTR : moyenne (resolvedAt − firstSeenAt) sur les détections résolues.
  const mttrRows = await prisma.$queryRaw<{ mttr: number | null }[]>(Prisma.sql`
    SELECT avg(extract(epoch FROM (d."resolvedAt" - d."firstSeenAt")))::float AS mttr
    FROM "Detection" d
    JOIN "Project" p ON p.id = d."projectId"
    WHERE p."userId" = ${userId}
      AND d.status = 'RESOLVED'
      AND d."resolvedAt" IS NOT NULL
      AND d.ignored = false
      ${pathFilter}
  `);
  const mttrSeconds = mttrRows[0]?.mttr ?? null;

  return {
    totals: { active, resolved, detections: active + resolved, events },
    bySeverity,
    byCategory,
    topSkills,
    mttrSeconds,
    reopenedCount,
  };
}

export type TrendBucket = "minute" | "hour" | "day";
export type Trends = { bucket: TrendBucket; points: TrendPoint[] };

/**
 * Tendances horodatées des événements (APPEARED/RESOLVED/REOPENED) par bucket.
 * `bucket` est borné à un jeu sûr ; `limit` ne garde que les N derniers points.
 */
export async function getTrends(
  userId: string,
  bucket: TrendBucket = "hour",
  limit = 24,
  projectPath?: string,
): Promise<Trends> {
  // date_trunc(unit, ts) accepte l'unité comme argument texte → paramètre lié, sûr.
  const unit: TrendBucket = bucket === "day" ? "day" : bucket === "minute" ? "minute" : "hour";
  const pathFilter = projectPath ? Prisma.sql`AND p."path" = ${projectPath}` : Prisma.empty;

  const rows = await prisma.$queryRaw<{ at: Date; type: TrendEventRow["type"]; count: number }[]>(Prisma.sql`
    SELECT date_trunc(${unit}, e."at") AS at, e.type AS type, count(*)::int AS count
    FROM "DetectionEvent" e
    JOIN "Project" p ON p.id = e."projectId"
    WHERE p."userId" = ${userId}
      ${pathFilter}
    GROUP BY 1, 2
    ORDER BY 1 ASC
  `);

  const points = foldTrendRows(
    rows.map((r) => ({ at: new Date(r.at).toISOString(), type: r.type, count: Number(r.count) })),
  );

  return { bucket: unit, points: points.slice(-limit) };
}
