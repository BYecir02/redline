import type { Rule } from "eslint";
import type { SkillMeta } from "../../types/report.js";
import type { CallExpression } from "estree";

/**
 * Skill N3 (backend JS/TS, sécurité) — CORS trop permissif.
 *
 * Signale deux façons d'ouvrir l'API à toutes les origines :
 *  1. `res.setHeader("Access-Control-Allow-Origin", "*")` (ou `.header(...)`) ;
 *  2. `cors({ origin: "*" })` (middleware express/cors).
 */

export const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Signale un CORS ouvert à toutes les origines (Allow-Origin: *).",
      recommended: true,
    },
    schema: [],
    messages: {
      corsWildcard:
        "CORS trop permissif (Access-Control-Allow-Origin: *) : n'importe quelle origine peut appeler l'API. Restreins à une liste blanche d'origines de confiance.",
    },
  },

  create(context) {
    return {
      CallExpression(node: CallExpression) {
        const callee = node.callee;

        // Cas 1 : res.setHeader("Access-Control-Allow-Origin", "*") / res.header(...)
        if (
          callee.type === "MemberExpression" &&
          !callee.computed &&
          callee.property.type === "Identifier" &&
          (callee.property.name === "setHeader" || callee.property.name === "header")
        ) {
          const [a0, a1] = node.arguments;
          if (
            a0?.type === "Literal" &&
            typeof a0.value === "string" &&
            a0.value.toLowerCase() === "access-control-allow-origin" &&
            a1?.type === "Literal" &&
            a1.value === "*"
          ) {
            context.report({ node, messageId: "corsWildcard" });
            return;
          }
        }

        // Cas 2 : cors({ origin: "*" })
        if (callee.type === "Identifier" && callee.name === "cors") {
          const arg = node.arguments[0];
          if (arg?.type === "ObjectExpression") {
            for (const prop of arg.properties) {
              if (
                prop.type === "Property" &&
                !prop.computed &&
                ((prop.key.type === "Identifier" && prop.key.name === "origin") ||
                  (prop.key.type === "Literal" && prop.key.value === "origin")) &&
                prop.value.type === "Literal" &&
                prop.value.value === "*"
              ) {
                context.report({ node, messageId: "corsWildcard" });
                return;
              }
            }
          }
        }
      },
    };
  },
};

/** Métadonnées de skill consommées par le registre (src/skills/index.ts). */
export const meta: SkillMeta = {
  id: "cors-wildcard",
  name: "CORS trop permissif",
  description: "Access-Control-Allow-Origin: * en production",
  category: "security",
  severity: "warning",
  pattern: 'res.setHeader("Access-Control-Allow-Origin", "*")',
  targets: ["javascript", "typescript", "express", "nestjs"],
};
