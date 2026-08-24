/**
 * Surveillance « côté navigateur » via l'API File System Access
 * pour hébergement distant (Vercel).
 */

export type DirHandle = FileSystemDirectoryHandle;
export type FileHandle = FileSystemFileHandle;

export type TreeNode = { name: string; children: TreeNode[] };

export type WatchedFileState = {
  filename: string;
  code: string;
  report: any; // BackendReport
};

export type BrowserStackEvidence = {
  files: string[];
  packageJsonContents: string[];
};

const WATCHABLE = /\.(js|jsx|ts|tsx)$/;
const IGNORED_DIRS = new Set([
  "node_modules", ".git", "dist", "build", "coverage",
  ".next", "__pycache__", ".cache", "vendor", "target",
]);

/** Vrai si le navigateur supporte showDirectoryPicker */
export function supportsDirectoryPicker(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (window as any).showDirectoryPicker === "function"
  );
}

/** Ouvre la fenêtre de sélection native */
export async function pickDirectory(): Promise<DirHandle | null> {
  const fn = (window as any).showDirectoryPicker;
  if (!fn) return null;
  try {
    return await fn({ mode: "read" });
  } catch {
    return null;
  }
}

// Registre des handles de répertoires en mémoire vive, indexés par watchId
const registry = new Map<string, DirHandle>();

export function registerDirectoryHandle(id: string, handle: DirHandle) {
  registry.set(id, handle);
}

export function getDirectoryHandle(id: string): DirHandle | undefined {
  return registry.get(id);
}

export function unregisterDirectoryHandle(id: string) {
  registry.delete(id);
}

/** Récupère l'arbre réel des sous-dossiers depuis le handle */
export async function getTreeFromHandle(handle: DirHandle): Promise<TreeNode[]> {
  const list: TreeNode[] = [];
  for await (const [name, entry] of (handle as any).entries()) {
    if (entry.kind === "directory" && !IGNORED_DIRS.has(name)) {
      const children = await getTreeFromHandle(entry as DirHandle);
      list.push({ name, children });
    }
  }
  return list.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Collecte les indices utiles à la détection de stack sans charger tout le code.
 * Les répertoires techniques sont ignorés et le nombre de fichiers est borné pour
 * garder le wizard réactif sur les gros dépôts et les monorepos.
 */
export async function inspectStackFromHandle(
  root: DirHandle,
  maxFiles = 1000,
  maxManifests = 20,
): Promise<BrowserStackEvidence> {
  const files: string[] = [];
  const packageJsonContents: string[] = [];

  const visit = async (dir: DirHandle, prefix: string, depth: number): Promise<void> => {
    if (files.length >= maxFiles || depth > 8) return;

    for await (const [name, entry] of (dir as any).entries()) {
      if (files.length >= maxFiles) break;
      const relativePath = prefix ? `${prefix}/${name}` : name;

      if (entry.kind === "directory") {
        if (!IGNORED_DIRS.has(name)) {
          await visit(entry as DirHandle, relativePath, depth + 1);
        }
        continue;
      }

      files.push(relativePath);
      if (name.toLowerCase() === "package.json" && packageJsonContents.length < maxManifests) {
        try {
          const file = await (entry as FileHandle).getFile();
          packageJsonContents.push(await file.text());
        } catch {
          // Le nom du manifeste reste un indice même si son contenu est illisible.
        }
      }
    }
  };

  await visit(root, "", 0);
  return { files, packageJsonContents };
}

/** Parcourt récursivement le dossier du handle et collecte les fichiers */
export async function collectFilesFromHandle(
  dir: DirHandle,
  prefix = "",
  exclude: string[] = []
): Promise<{ path: string; file: File }[]> {
  const out: { path: string; file: File }[] = [];
  
  // Fonction utilitaire pour vérifier si un chemin relatif est exclu
  const isExcluded = (relPath: string) => {
    return exclude.some((ex) => relPath === ex || relPath.startsWith(`${ex}/`));
  };

  for await (const [name, handle] of (dir as any).entries()) {
    const rel = prefix ? `${prefix}/${name}` : name;
    if (isExcluded(rel)) {
      continue;
    }

    if (handle.kind === "directory") {
      if (!IGNORED_DIRS.has(name)) {
        out.push(...(await collectFilesFromHandle(handle as DirHandle, rel, exclude)));
      }
    } else if (WATCHABLE.test(name)) {
      try {
        const file = await (handle as FileHandle).getFile();
        out.push({ path: rel, file });
      } catch {
        // Ignorer si lecture impossible
      }
    }
  }
  return out;
}
