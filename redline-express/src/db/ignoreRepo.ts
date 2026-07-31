/**
 * Gestion des détections IGNORÉES (faux positifs assumés), persistée par
 * utilisateur/projet. Un ignore est identifié par (projet, signature de contenu)
 * et reste définitif jusqu'à restauration explicite.
 */
import { prisma } from "./client.js";

/** Une entrée ignorée telle que consommée par le front (path = dossier). */
export type IgnoredEntry = { projectPath: string; signature: string };

/**
 * Marque/dé-marque une détection comme ignorée, par (chemin de projet, signature).
 * Renvoie true si une détection correspondante existait. Best-effort côté appelant :
 * si la détection n'est pas (encore) persistée, l'ignore local du front prend le relais.
 */
export async function setIgnored(
  userId: string,
  projectPath: string,
  signature: string,
  ignored: boolean,
): Promise<boolean> {
  const project = await prisma.project.findUnique({
    where: { userId_path: { userId, path: projectPath } },
    select: { id: true },
  });
  if (!project) return false;

  const { count } = await prisma.detection.updateMany({
    where: { projectId: project.id, signature },
    data: { ignored },
  });
  return count > 0;
}

/** Restaure TOUTES les détections ignorées de l'utilisateur (ignored → false). */
export async function restoreAllIgnored(userId: string): Promise<void> {
  await prisma.detection.updateMany({
    where: { project: { userId }, ignored: true },
    data: { ignored: false },
  });
}

/** Liste les détections ignorées de l'utilisateur : { projectPath, signature }. */
export async function listIgnored(userId: string): Promise<IgnoredEntry[]> {
  const rows = await prisma.detection.findMany({
    where: { project: { userId }, ignored: true },
    select: { signature: true, project: { select: { path: true } } },
  });
  return rows.map((r) => ({ projectPath: r.project.path, signature: r.signature }));
}
