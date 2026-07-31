import { readdirSync } from "node:fs";
import path from "node:path";

/** Dossiers ignorés lors de la lecture de l'arbre (bruit / dépendances). */
const IGNORED_DIRS = new Set([
  "node_modules", ".git", "dist", "build", "coverage",
  ".next", "__pycache__", ".cache", "vendor", "target",
]);

/** Nœud d'arborescence : un dossier et ses sous-dossiers (pas les fichiers). */
export type TreeNode = { name: string; children: TreeNode[] };

/**
 * Lit récursivement l'arborescence des DOSSIERS sous `root` (fichiers exclus),
 * en profondeur complète. Ignore les dossiers de bruit et les liens symboliques
 * (isDirectory() est faux pour un symlink → pas de boucle infinie).
 */
export function readDirTree(root: string): TreeNode[] {
  let entries;
  try {
    entries = readdirSync(root, { withFileTypes: true });
  } catch {
    return [];
  }

  return entries
    .filter((e) => e.isDirectory() && !IGNORED_DIRS.has(e.name))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((d) => ({
      name: d.name,
      children: readDirTree(path.join(root, d.name)),
    }));
}
