import type { Rule } from "eslint";
import type { SkillMeta } from "../../types/report.js";
import type { AssignmentExpression } from "estree";

/**
 * Skill N3 (front JS/TS, sécurité) — risque XSS.
 *
 * Signale deux motifs classiques d'injection HTML non sanitisée :
 *  1. affectation à `innerHTML` / `outerHTML` depuis une valeur DYNAMIQUE
 *     (on épargne les strings littérales statiques, non contrôlées par l'user) ;
 *  2. l'attribut React `dangerouslySetInnerHTML`.
 */

const RISKY_PROPS = new Set(["innerHTML", "outerHTML"]);

export const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Signale les injections HTML non sanitisées (risque XSS).",
      recommended: true,
    },
    schema: [],
    messages: {
      innerHtml:
        "Affectation à {{prop}} depuis une valeur dynamique : risque XSS. Sanitize (DOMPurify) ou construis le DOM via l'API.",
      dangerousJsx:
        "dangerouslySetInnerHTML : risque XSS si le HTML vient d'une source utilisateur. Sanitize avant injection (DOMPurify).",
    },
  },

  create(context) {
    return {
      AssignmentExpression(node: AssignmentExpression) {
        if (node.operator !== "=" && node.operator !== "+=") return;
        const left = node.left;
        if (left.type !== "MemberExpression" || left.computed) return;
        if (left.property.type !== "Identifier" || !RISKY_PROPS.has(left.property.name)) return;
        // HTML statique (string littérale) : pas de donnée utilisateur → on épargne.
        if (node.right.type === "Literal" && typeof node.right.value === "string") return;

        context.report({ node, messageId: "innerHtml", data: { prop: left.property.name } });
      },

      // Attribut JSX `dangerouslySetInnerHTML` (JSX non typé par estree → accès souple).
      JSXAttribute(node: Rule.Node) {
        const name = (node as unknown as { name?: { name?: unknown } }).name?.name;
        if (name === "dangerouslySetInnerHTML") {
          context.report({ node, messageId: "dangerousJsx" });
        }
      },
    };
  },
};

/** Métadonnées de skill consommées par le registre (src/skills/index.ts). */
export const meta: SkillMeta = {
  id: "xss-risk",
  name: "XSS potentiel",
  description: "Utilisation de innerHTML ou dangerouslySetInnerHTML",
  category: "security",
  severity: "warning",
  pattern: "element.innerHTML = userInput",
  targets: ["javascript", "typescript", "react", "nextjs", "vue"],
};
