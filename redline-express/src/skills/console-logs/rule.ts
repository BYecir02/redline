import type { Rule } from "eslint";
import type { SkillMeta } from "../../types/report.js";
import type { CallExpression } from "estree";

/**
 * Skill N2 (JS/TS, qualité) — console.log de debug oublié.
 *
 * Signale les appels `console.log` / `console.debug` / `console.info` — typiques
 * de logs de debug laissés en production. On NE signale PAS `console.error` /
 * `console.warn`, qui sont des usages légitimes de journalisation.
 */

const DEBUG_METHODS = new Set(["log", "debug", "info"]);

export const rule: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Signale les console.log/debug/info laissés dans le code.",
      recommended: true,
    },
    schema: [],
    messages: {
      consoleLog:
        "console.{{method}} laissé dans le code : retire ce log de debug ou passe par un logger conditionnel.",
    },
  },

  create(context) {
    return {
      CallExpression(node: CallExpression) {
        const callee = node.callee;
        if (callee.type !== "MemberExpression" || callee.computed) return;
        if (callee.object.type !== "Identifier" || callee.object.name !== "console") return;
        if (callee.property.type !== "Identifier" || !DEBUG_METHODS.has(callee.property.name)) return;

        context.report({
          node,
          messageId: "consoleLog",
          data: { method: callee.property.name },
        });
      },
    };
  },
};

/** Métadonnées de skill consommées par le registre (src/skills/index.ts). */
export const meta: SkillMeta = {
  id: "console-logs",
  name: "Console.log oubliés",
  description: "Logs de debug laissés dans le code de prod",
  category: "quality",
  severity: "warning",
  pattern: 'console.log("debug user:", userData)',
  targets: ["javascript", "typescript"],
};
