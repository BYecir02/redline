// Client HTTP du backend redline (backend-express).
// Base d'URL surchargeable via VITE_API_URL (voir .env), défaut = port 3001.
import { getToken } from "./token";

export const API_URL: string = import.meta.env.VITE_API_URL ?? "http://localhost:3001/api";

/**
 * En-têtes communs à toutes les requêtes : Content-Type + Authorization si un
 * jeton est présent. Les routes protégées côté backend lisent ce Bearer.
 */
export function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getToken();
  return {
    ...(extra ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// Contrats renvoyés par le backend (voir backend-express/src/types/report.ts).
export type BackendSeverity = "critical" | "warning" | "info";
export type BackendCategory = "security" | "quality" | "reliability";

export type BackendIssue = {
  id: string;
  skillId: string;
  category: BackendCategory;
  severity: BackendSeverity;
  line: number;
  message: string;
  before: string;
  suggestedFix?: string;
};

export type BackendReport = {
  filename: string;
  issues: BackendIssue[];
  scannedAt: string;
};

export type SkillMeta = {
  id: string;
  name: string;
  description: string;
  category: BackendCategory;
  severity: BackendSeverity;
  pattern: string;
  targets: string[] | "all";
};

/** Événement poussé par le flux de surveillance (SSE), taggé du dossier (watchId). */
export type WatchEvent =
  | { type: "file"; watchId: string; filename: string; code: string; report: BackendReport }
  | { type: "remove"; watchId: string; filename: string };

/** URL du flux SSE de surveillance (à ouvrir via EventSource). */
export const watchStreamUrl = `${API_URL}/watch/stream`;

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Requête ${path} échouée (${res.status}) ${detail}`.trim());
  }
  return res.json() as Promise<T>;
}

/**
 * Analyse le code d'un fichier : POST /api/scan.
 * `projectPath` (optionnel) = dossier racine : s'il est fourni, le backend
 * persiste le résultat sous le projet de l'utilisateur (historique/tendances).
 */
export function scanCode(
  code: string,
  filename: string,
  skills: string[],
  projectPath?: string,
  exclude?: string[],
): Promise<BackendReport> {
  return postJson<BackendReport>("/scan", { code, filename, skills, projectPath, exclude });
}

/** Catalogue complet des skills : GET /api/skills. */
export async function getSkills(): Promise<SkillMeta[]> {
  const res = await fetch(`${API_URL}/skills`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`getSkills échoué (${res.status})`);
  return res.json() as Promise<SkillMeta[]>;
}

/** Nœud d'arborescence (dossiers uniquement) renvoyé par POST /api/tree. */
export type TreeNode = { name: string; children: TreeNode[] };

/** Lit l'arbre réel des sous-dossiers d'un chemin : POST /api/tree. */
export async function getTree(path: string): Promise<TreeNode[]> {
  const res = await postJson<{ tree: TreeNode[] }>("/tree", { path });
  return res.tree;
}

/**
 * Démarre (ou redémarre) la surveillance d'un dossier : POST /api/watch/start.
 * `exclude` : sous-dossiers (chemins relatifs) décochés à ne pas surveiller.
 */
export function startWatch(
  path: string,
  skills: string[],
  exclude: string[] = [],
): Promise<{ status: string; path: string }> {
  return postJson("/watch/start", { path, skills, exclude });
}

/** Arrête la surveillance en cours : POST /api/watch/stop. */
export function stopWatch(): Promise<{ status: string }> {
  return postJson("/watch/stop", {});
}

/** Une entrée de surveillance : un dossier avec ses skills et exclusions. */
export type WatchSpec = { id: string; path: string; skills: string[]; exclude: string[] };

/**
 * Surveille EXACTEMENT cet ensemble de dossiers : POST /api/watch/sync.
 * Le backend calcule le diff (démarre/arrête/met à jour). Tableau vide = tout arrêter.
 */
export function syncWatch(watchers: WatchSpec[]): Promise<{ status: string; active: string[] }> {
  return postJson("/watch/sync", { watchers });
}

// --- Analytics (persistance Postgres, scopées par utilisateur) -----------

export type StatusSplit = { active: number; resolved: number };
export type StatsSummary = {
  totals: { active: number; resolved: number; detections: number; events: number };
  bySeverity: ({ severity: BackendSeverity } & StatusSplit)[];
  byCategory: ({ category: BackendCategory } & StatusSplit)[];
  topSkills: ({ skillId: string; total: number } & StatusSplit)[];
  mttrSeconds: number | null;
  reopenedCount: number;
};

export type TrendPoint = { at: string; appeared: number; resolved: number; reopened: number };
export type StatsTrends = { bucket: "minute" | "hour" | "day"; points: TrendPoint[] };

/** Synthèse analytique de l'utilisateur : GET /api/stats/summary. */
export async function getSummary(projectPath?: string): Promise<StatsSummary> {
  const q = projectPath ? `?projectPath=${encodeURIComponent(projectPath)}` : "";
  const res = await fetch(`${API_URL}/stats/summary${q}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`getSummary échoué (${res.status})`);
  return res.json() as Promise<StatsSummary>;
}

/** Un projet déjà surveillé (historique des sessions). */
export type ProjectSummary = {
  id: string;
  path: string;
  label: string | null;
  /** Skills activés à la dernière config (rejoués à la reprise). */
  skills: string[];
  /** Sous-dossiers exclus à la dernière config (rejoués à la reprise). */
  excluded: string[];
  createdAt: string;
  activeCount: number;
  resolvedCount: number;
  lastActivityAt: string | null;
};

/** Historique des sessions de l'utilisateur : GET /api/projects. */
export async function getProjects(): Promise<ProjectSummary[]> {
  const res = await fetch(`${API_URL}/projects`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`getProjects échoué (${res.status})`);
  return res.json() as Promise<ProjectSummary[]>;
}

// --- Détections ignorées (faux positifs), persistées par utilisateur/projet ----

export type IgnoredEntry = { projectPath: string; signature: string };

/** Signatures ignorées de l'utilisateur : GET /api/detections/ignored. */
export async function getIgnored(): Promise<IgnoredEntry[]> {
  const res = await fetch(`${API_URL}/detections/ignored`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`getIgnored échoué (${res.status})`);
  return res.json() as Promise<IgnoredEntry[]>;
}

/** Marque une détection comme ignorée : POST /api/detections/ignore. */
export function ignoreDetection(projectPath: string, signature: string): Promise<{ matched: boolean }> {
  return postJson("/detections/ignore", { projectPath, signature });
}

/** Restaure toutes les détections ignorées : POST /api/detections/restore-all. */
export function restoreAllIgnored(): Promise<{ status: string }> {
  return postJson("/detections/restore-all", {});
}

/** Tendances horodatées : GET /api/stats/trends?bucket=&limit=&projectPath=. */
export async function getTrends(
  bucket: "minute" | "hour" | "day" = "hour",
  limit = 24,
  projectPath?: string,
): Promise<StatsTrends> {
  const pp = projectPath ? `&projectPath=${encodeURIComponent(projectPath)}` : "";
  const res = await fetch(`${API_URL}/stats/trends?bucket=${bucket}&limit=${limit}${pp}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`getTrends échoué (${res.status})`);
  return res.json() as Promise<StatsTrends>;
}

/**
 * Analyse IA à la demande d'un problème : POST /api/analyze (clé API utilisateur).
 * `provider` + `model` = choix global de la session (voir domain/ai.ts).
 */
export function analyzeIssue(body: {
  apiKey: string;
  provider: string;
  model: string;
  skillName: string;
  category: string;
  severity: string;
  filename: string;
  line: number;
  snippet: string;
}): Promise<{ analysis: string }> {
  return postJson("/analyze", body);
}
