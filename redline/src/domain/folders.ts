// Arbre de sous-dossiers surveillés : construction, bascule d'inclusion, comptage.
import type { SubFolder } from "./types";
import { guessProjectType } from "./stack";

export const AUTO_EXCLUDED = ["node_modules", ".git", "dist", "build", "coverage", ".next", "__pycache__", ".cache", "vendor", "target"];

export type SubFolderDef = { name: string; children?: SubFolderDef[] };

export const SUBFOLDER_TREE: Record<string, SubFolderDef[]> = {
  node: [
    { name: "src", children: [
      { name: "components" }, { name: "hooks" }, { name: "utils" },
      { name: "pages" }, { name: "services" }, { name: "types" },
    ]},
    { name: "public" },
    { name: "tests", children: [{ name: "unit" }, { name: "integration" }] },
    { name: "scripts" },
    { name: "config" },
    { name: "node_modules" }, { name: ".git" }, { name: "dist" }, { name: "coverage" }, { name: ".next" },
  ],
  python: [
    { name: "app", children: [
      { name: "models" }, { name: "routes" }, { name: "services" },
      { name: "utils" }, { name: "templates" }, { name: "static" },
    ]},
    { name: "tests", children: [{ name: "unit" }, { name: "integration" }] },
    { name: "scripts" },
    { name: "migrations" },
    { name: "static" },
    { name: "__pycache__" }, { name: ".git" }, { name: "dist" }, { name: "build" }, { name: "vendor" },
  ],
  generic: [
    { name: "src", children: [
      { name: "lib" }, { name: "utils" }, { name: "core" },
    ]},
    { name: "lib" },
    { name: "tests" },
    { name: "docs" },
    { name: "config" },
    { name: "scripts" },
    { name: ".git" }, { name: "build" }, { name: "dist" }, { name: "node_modules" },
  ],
};

export function buildSubFolderTree(defs: SubFolderDef[]): SubFolder[] {
  return defs.map(def => ({
    name: def.name,
    included: !AUTO_EXCLUDED.includes(def.name),
    autoExcluded: AUTO_EXCLUDED.includes(def.name),
    children: def.children ? buildSubFolderTree(def.children) : [],
  }));
}

export function generateSubFolders(path: string): SubFolder[] {
  const type = guessProjectType(path);
  return buildSubFolderTree(SUBFOLDER_TREE[type]);
}

/** Nœud d'arbre réel (lu du disque via l'API), sans les flags d'inclusion. */
type RawTreeNode = { name: string; children: RawTreeNode[] };

/** Construit l'arbre SubFolder (cochable) à partir de l'arbre réel du disque. */
export function buildSubFoldersFromTree(nodes: RawTreeNode[]): SubFolder[] {
  return nodes.map((n) => ({
    name: n.name,
    included: !AUTO_EXCLUDED.includes(n.name),
    autoExcluded: AUTO_EXCLUDED.includes(n.name),
    children: buildSubFoldersFromTree(n.children),
  }));
}

/**
 * Collecte les chemins relatifs des sous-dossiers exclus (décochés ou auto-exclus).
 * Cascade : dès qu'un dossier est exclu, on n'explore pas ses enfants — son
 * sous-arbre entier est coupé (le backend fait un match par préfixe).
 */
export function collectExcluded(nodes: SubFolder[], prefix = ""): string[] {
  const out: string[] = [];
  for (const n of nodes) {
    const p = prefix ? `${prefix}/${n.name}` : n.name;
    if (!n.included || n.autoExcluded) {
      out.push(p);
    } else {
      out.push(...collectExcluded(n.children, p));
    }
  }
  return out;
}

/**
 * Fusionne un arbre FRAÎCHEMENT relu du disque avec l'arbre précédent, en
 * PRÉSERVANT les choix d'inclusion de l'utilisateur pour les nœuds qui existaient
 * déjà. Les nouveaux dossiers apparaissent (cochés par défaut, sauf auto-exclus) ;
 * les dossiers disparus du disque sont naturellement absents du résultat.
 */
export function mergeTree(fresh: SubFolder[], prev: SubFolder[]): SubFolder[] {
  const prevByName = new Map(prev.map((n) => [n.name, n]));
  return fresh.map((n) => {
    const old = prevByName.get(n.name);
    return {
      ...n,
      // Nœud déjà connu → on garde le coché/décoché de l'utilisateur ; sinon défaut.
      included: old ? old.included : n.included,
      children: mergeTree(n.children, old ? old.children : []),
    };
  });
}

/**
 * Réapplique une liste de chemins exclus (relatifs, cascade) à un arbre : marque
 * `included: false` chaque nœud dont le chemin figure dans `excluded`. Sert à
 * restaurer la sélection de sous-dossiers d'un projet repris depuis la base.
 */
export function applyExcluded(nodes: SubFolder[], excluded: string[], prefix = ""): SubFolder[] {
  const set = new Set(excluded);
  const apply = (list: SubFolder[], pre: string): SubFolder[] =>
    list.map((n) => {
      const p = pre ? `${pre}/${n.name}` : n.name;
      if (set.has(p)) return { ...n, included: false };
      return { ...n, children: apply(n.children, p) };
    });
  return apply(nodes, prefix);
}

export function toggleInTree(nodes: SubFolder[], pathParts: string[]): SubFolder[] {
  const [head, ...rest] = pathParts;
  return nodes.map(node => {
    if (node.name !== head) return node;
    if (rest.length === 0) return { ...node, included: !node.included };
    return { ...node, children: toggleInTree(node.children, rest) };
  });
}

export function countIncluded(nodes: SubFolder[]): number {
  return nodes.reduce((acc, n) =>
    acc + (n.included && !n.autoExcluded ? 1 : 0) + countIncluded(n.children), 0
  );
}
