import type { Rule } from "eslint";
import type { SkillMeta } from "../../types/report.js";

/**
 * Skill N1 (universel, qualité) — commentaire TODO / FIXME non résolu.
 *
 * Parcourt les commentaires du fichier et signale ceux qui contiennent le mot
 * TODO ou FIXME (insensible à la casse, borné par des limites de mot pour éviter
 * de matcher au milieu d'un autre mot).
 */

const TAG = /\b(TODO|FIXME)\b/i;

export const rule: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Signale les commentaires TODO / FIXME non résolus.",
      recommended: true,
    },
    schema: [],
    messages: {
      todoFixme:
        "Commentaire non résolu ({{tag}}) : traite-le avant le déploiement ou crée un ticket de suivi.",
    },
  },

  create(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          const match = comment.value.match(TAG);
          if (match && comment.loc) {
            context.report({
              loc: comment.loc,
              messageId: "todoFixme",
              data: { tag: match[1].toUpperCase() },
            });
          }
        }
      },
    };
  },
};

/** Métadonnées de skill consommées par le registre (src/skills/index.ts). */
export const meta: SkillMeta = {
  id: "todo-fixme",
  name: "TODO / FIXME",
  description: "Commentaires non résolus dans le code",
  category: "quality",
  severity: "info",
  pattern: "// TODO: handle edge case when user is null",
  targets: "all",
};
