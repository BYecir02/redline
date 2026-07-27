import type { Rule } from "eslint";
import type { SkillMeta } from "../types/report.js";
import {
  rule as sqlInjectionRule,
  meta as sqlInjectionMeta,
} from "./sql-injection/rule.js";
import {
  rule as missingErrorHandlingRule,
  meta as missingErrorHandlingMeta,
} from "./missing-error-handling/rule.js";
import {
  rule as hardcodedSecretRule,
  meta as hardcodedSecretMeta,
} from "./hardcoded-secret/rule.js";
import {
  rule as consoleLogsRule,
  meta as consoleLogsMeta,
} from "./console-logs/rule.js";
import {
  rule as todoFixmeRule,
  meta as todoFixmeMeta,
} from "./todo-fixme/rule.js";
import {
  rule as unusedImportsRule,
  meta as unusedImportsMeta,
} from "./unused-imports/rule.js";
import {
  rule as xssRiskRule,
  meta as xssRiskMeta,
} from "./xss-risk/rule.js";
import {
  rule as corsWildcardRule,
  meta as corsWildcardMeta,
} from "./cors-wildcard/rule.js";

/**
 * Un skill = une règle ESLint + ses métadonnées de domaine (catégorie, gravité).
 * Le moteur ne connaît que cette interface : ajouter un skill = ajouter une
 * entrée dans le registre, sans toucher à l'analyzer ni au reste du cœur.
 */
export type SkillModule = SkillMeta & {
  rule: Rule.RuleModule;
};

/** Registre central des skills disponibles, indexé par id. */
export const skills: Record<string, SkillModule> = {
  [sqlInjectionMeta.id]: { ...sqlInjectionMeta, rule: sqlInjectionRule },
  [missingErrorHandlingMeta.id]: { ...missingErrorHandlingMeta, rule: missingErrorHandlingRule },
  [hardcodedSecretMeta.id]: { ...hardcodedSecretMeta, rule: hardcodedSecretRule },
  [consoleLogsMeta.id]: { ...consoleLogsMeta, rule: consoleLogsRule },
  [todoFixmeMeta.id]: { ...todoFixmeMeta, rule: todoFixmeRule },
  [unusedImportsMeta.id]: { ...unusedImportsMeta, rule: unusedImportsRule },
  [xssRiskMeta.id]: { ...xssRiskMeta, rule: xssRiskRule },
  [corsWildcardMeta.id]: { ...corsWildcardMeta, rule: corsWildcardRule },
};

/**
 * Résout une liste d'ids de skills en modules concrets.
 * Les ids inconnus sont ignorés silencieusement (le front pilote la sélection).
 */
export function getSkills(ids: string[]): SkillModule[] {
  return ids
    .map((id) => skills[id])
    .filter((skill): skill is SkillModule => Boolean(skill));
}
