/**
 * Contrat de données entre le moteur d'analyse et l'interface.
 * C'est la forme JSON renvoyée par POST /api/scan et consommée par le front
 * (vue fichier annoté). Toute évolution ici impacte le front — à garder stable.
 */

/**
 * Catégorie d'un problème (identifiant machine, neutre en langue).
 * L'UI mappe vers un libellé affiché : security→Sécurité, quality→Qualité,
 * reliability→Robustesse.
 */
export type IssueCategory = "security" | "quality" | "reliability";

/** Gravité sur 3 niveaux (aligné sur l'UI). */
export type IssueSeverity = "critical" | "warning" | "info";

/** Un problème unitaire détecté sur une ligne précise d'un fichier. */
export type Issue = {
  /** Identifiant unique de l'occurrence (pas de la règle). */
  id: string;
  /** Skill (règle) à l'origine de la détection, ex. "sql-injection". */
  skillId: string;
  category: IssueCategory;
  severity: IssueSeverity;
  /** Ligne concernée (1-indexée, comme ESLint). */
  line: number;
  /** Message lisible expliquant le problème. */
  message: string;
  /** Contenu de la ligne fautive, pour l'afficher tel quel côté UI. */
  before: string;
  /** Correctif proposé (rempli plus tard par la boucle IA). */
  suggestedFix?: string;
};

/** Rapport d'analyse pour un fichier. */
export type ScanReport = {
  filename: string;
  issues: Issue[];
  /** Horodatage ISO 8601 de l'analyse. */
  scannedAt: string;
};

/** Stacks ciblées par un skill : liste d'ids, ou "all" (langage-agnostique). */
export type SkillTargets = string[] | "all";

/**
 * Métadonnées publiques d'un skill — c'est le contrat renvoyé par GET /api/skills
 * et consommé par le catalogue de l'UI (le champ `rule` ESLint reste privé).
 */
export type SkillMeta = {
  id: string;
  name: string;
  description: string;
  category: IssueCategory;
  severity: IssueSeverity;
  /** Exemple de code déclenchant le skill (affiché dans le catalogue). */
  pattern: string;
  targets: SkillTargets;
};
