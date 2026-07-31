/**
 * Lecture des projets d'un utilisateur (historique des sessions) : chaque dossier
 * déjà surveillé, avec ses compteurs de détections et sa dernière activité.
 * Sert à proposer « Reprendre une session » à l'entrée de l'app.
 */
import { prisma } from "./client.js";

export type ProjectSummary = {
  id: string;
  path: string;
  label: string | null;
  /** Skills activés lors de la dernière configuration (rejoués à la reprise). */
  skills: string[];
  /** Sous-dossiers exclus (chemins relatifs), rejoués à la reprise. */
  excluded: string[];
  createdAt: string;
  activeCount: number;
  resolvedCount: number;
  /** Dernière fois qu'une détection de ce projet a été vue (ISO), ou null. */
  lastActivityAt: string | null;
};

/**
 * Enregistre la config d'un projet (skills activés et/ou sous-dossiers exclus),
 * upsert par userId+path. Seuls les champs fournis sont mis à jour. Appelé quand
 * l'utilisateur (re)configure la surveillance : c'est cette config qui sera
 * restaurée à la reprise de session.
 */
export async function upsertProjectConfig(
  userId: string,
  path: string,
  config: { skills?: string[]; excluded?: string[] },
): Promise<void> {
  const update: { skills?: string[]; excluded?: string[] } = {};
  if (config.skills !== undefined) update.skills = config.skills;
  if (config.excluded !== undefined) update.excluded = config.excluded;

  await prisma.project.upsert({
    where: { userId_path: { userId, path } },
    update,
    create: { userId, path, skills: config.skills ?? [], excluded: config.excluded ?? [] },
  });
}

/** Liste les projets de l'utilisateur, du plus récemment actif au plus ancien. */
export async function listProjects(userId: string): Promise<ProjectSummary[]> {
  const [projects, statusCounts, lastSeen] = await Promise.all([
    prisma.project.findMany({
      where: { userId },
      select: { id: true, path: true, label: true, skills: true, excluded: true, createdAt: true },
    }),
    prisma.detection.groupBy({
      by: ["projectId", "status"],
      where: { project: { userId }, ignored: false },
      _count: { _all: true },
    }),
    prisma.detection.groupBy({
      by: ["projectId"],
      where: { project: { userId } },
      _max: { lastSeenAt: true },
    }),
  ]);

  const active = new Map<string, number>();
  const resolved = new Map<string, number>();
  for (const row of statusCounts) {
    if (row.status === "ACTIVE") active.set(row.projectId, row._count._all);
    else if (row.status === "RESOLVED") resolved.set(row.projectId, row._count._all);
  }
  const lastById = new Map(lastSeen.map((r) => [r.projectId, r._max.lastSeenAt]));

  return projects
    .map((p) => {
      const last = lastById.get(p.id) ?? null;
      return {
        id: p.id,
        path: p.path,
        label: p.label,
        skills: p.skills,
        excluded: p.excluded,
        createdAt: p.createdAt.toISOString(),
        activeCount: active.get(p.id) ?? 0,
        resolvedCount: resolved.get(p.id) ?? 0,
        lastActivityAt: last ? last.toISOString() : null,
      };
    })
    .sort((a, b) => {
      // Plus récemment actif d'abord ; à défaut d'activité, par date de création.
      const ka = a.lastActivityAt ?? a.createdAt;
      const kb = b.lastActivityAt ?? b.createdAt;
      return ka < kb ? 1 : ka > kb ? -1 : 0;
    });
}
