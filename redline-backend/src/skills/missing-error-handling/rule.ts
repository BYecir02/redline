import type { Rule } from "eslint";
import type { SkillMeta } from "../../types/report.js";
import type { Node, CallExpression, AwaitExpression } from "estree";

/**
 * Skill N3 (framework Express) — gestion d'erreur manquante dans un handler.
 *
 * Signale un handler passé à `router.get/post/put/delete/patch` (ou `app.*`) qui
 * contient :
 *  - une expression `await` qui n'est PAS à l'intérieur d'un `try/catch`, ou
 *  - un `.then()` sur une promesse dont la chaîne n'a ni `.catch()` ni second
 *    argument de `.then(onOk, onErr)`, et qui n'est pas dans un `try/catch`.
 *
 * Ne signale PAS un handler déjà encapsulé correctement (try/catch autour de
 * l'await, ou .catch()/handler d'erreur sur la chaîne de promesse). Les
 * fonctions imbriquées dans le handler ont leur propre contexte d'erreur et ne
 * sont donc pas inspectées comme si c'était le handler lui-même.
 */

const HTTP_METHODS = new Set(["get", "post", "put", "delete", "patch"]);
const ROUTER_NAMES = new Set(["router", "app"]);
const FUNCTION_TYPES = new Set([
  "FunctionExpression",
  "ArrowFunctionExpression",
  "FunctionDeclaration",
]);

/** Vrai si l'appel est `router.<method>(...)` / `app.<method>(...)`. */
function isRouteCall(node: CallExpression): boolean {
  const callee = node.callee;
  return (
    callee.type === "MemberExpression" &&
    callee.property.type === "Identifier" &&
    HTTP_METHODS.has(callee.property.name) &&
    callee.object.type === "Identifier" &&
    ROUTER_NAMES.has(callee.object.name)
  );
}

/** Vrai si l'appel est `<expr>.then(...)`. */
function isThenCall(node: Node): node is CallExpression {
  return (
    node.type === "CallExpression" &&
    node.callee.type === "MemberExpression" &&
    node.callee.property.type === "Identifier" &&
    node.callee.property.name === "then"
  );
}

/** Vrai si l'appel est `<expr>.catch(...)`. */
function isCatchCall(node: Node): boolean {
  return (
    node.type === "CallExpression" &&
    node.callee.type === "MemberExpression" &&
    node.callee.property.type === "Identifier" &&
    node.callee.property.name === "catch"
  );
}

export const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Exige une gestion d'erreur (try/catch ou .catch()) autour du travail asynchrone dans les handlers Express.",
      recommended: true,
    },
    schema: [],
    messages: {
      missingErrorHandling:
        "Travail asynchrone sans gestion d'erreur dans un handler Express : entoure l'await d'un try/catch, ou ajoute un .catch() à la chaîne de promesse (sinon la promesse rejetée crashe le process).",
    },
  },

  create(context) {
    const sourceCode = context.sourceCode;
    const handlerNodes = new Set<Node>();
    const processedChains = new Set<Node>();

    /** Renvoie le handler de route englobant si c'est la fonction la plus proche, sinon null. */
    function nearestHandler(node: Node): Node | null {
      const ancestors = sourceCode.getAncestors(node);
      for (let i = ancestors.length - 1; i >= 0; i--) {
        const ancestor = ancestors[i];
        if (FUNCTION_TYPES.has(ancestor.type)) {
          return handlerNodes.has(ancestor) ? ancestor : null;
        }
      }
      return null;
    }

    /** Vrai si `node` est dans le bloc `try` d'un try/catch situé dans le handler. */
    function isInsideTry(node: Node, handler: Node): boolean {
      const path = [...sourceCode.getAncestors(node), node];
      const handlerIndex = path.indexOf(handler);
      for (let i = handlerIndex + 1; i < path.length - 1; i++) {
        const current = path[i];
        if (current.type === "TryStatement" && current.block === path[i + 1]) {
          return true;
        }
      }
      return false;
    }

    /** Remonte au sommet de la chaîne member/call (`a().then(x).catch(y)`). */
    function chainTop(node: Node): Node {
      const ancestors = sourceCode.getAncestors(node);
      let top: Node = node;
      for (let i = ancestors.length - 1; i >= 0; i--) {
        const parent = ancestors[i];
        if (
          (parent.type === "MemberExpression" && parent.object === top) ||
          (parent.type === "CallExpression" && parent.callee === top)
        ) {
          top = parent;
        } else {
          break;
        }
      }
      return top;
    }

    /**
     * Vrai si la chaîne gère les erreurs : présence d'un `.catch(...)` ou d'un
     * `.then(onOk, onErr)`. On ne descend pas dans les callbacks (leur `.catch`
     * interne ne protège pas la chaîne courante).
     */
    function chainHasErrorHandling(node: Node | null | undefined): boolean {
      if (!node || typeof node.type !== "string") return false;
      if (isCatchCall(node)) return true;
      if (isThenCall(node) && node.arguments.length >= 2) return true;

      for (const key of Object.keys(node)) {
        if (key === "parent") continue;
        const value = (node as unknown as Record<string, unknown>)[key];
        const children = Array.isArray(value) ? value : [value];
        for (const child of children) {
          if (child && typeof child === "object" && "type" in child) {
            const childNode = child as Node;
            if (FUNCTION_TYPES.has(childNode.type)) continue;
            if (chainHasErrorHandling(childNode)) return true;
          }
        }
      }
      return false;
    }

    return {
      CallExpression(node: CallExpression) {
        if (isRouteCall(node)) {
          for (const arg of node.arguments) {
            if (FUNCTION_TYPES.has(arg.type)) {
              handlerNodes.add(arg as Node);
            }
          }
        }

        if (isThenCall(node)) {
          const handler = nearestHandler(node);
          if (!handler) return;
          if (isInsideTry(node, handler)) return;

          const top = chainTop(node);
          if (processedChains.has(top)) return;
          processedChains.add(top);

          if (!chainHasErrorHandling(top)) {
            context.report({ node, messageId: "missingErrorHandling" });
          }
        }
      },

      AwaitExpression(node: AwaitExpression) {
        const handler = nearestHandler(node);
        if (!handler) return;
        if (isInsideTry(node, handler)) return;
        context.report({ node, messageId: "missingErrorHandling" });
      },
    };
  },
};

/** Métadonnées de skill consommées par le registre (src/skills/index.ts). */
export const meta: SkillMeta = {
  id: "missing-error-handling",
  name: "Try/catch manquant",
  description: "Appels async sans gestion d'erreur",
  category: "reliability",
  severity: "warning",
  pattern: "const data = await fetchUser(id) // no try/catch",
  targets: ["javascript", "typescript"],
};
