import type { Rule } from "eslint";
import type { SkillMeta } from "../../types/report.js";
import type { VariableDeclaration, VariableDeclarator } from "estree";

/**
 * Skill N1 (universel/sécurité) — secret en dur.
 *
 * Signale une variable `const`/`let` dont le nom (insensible à la casse)
 * contient `key`, `secret`, `token` ou `password`, assignée à une string
 * littérale ne commençant pas par `process.env`, ET dont la valeur ressemble
 * réellement à un secret :
 *  - elle matche un pattern de clé connu (`sk_live_`, `AKIA`, `ghp_`, `eyJ`), ou
 *  - elle fait > 20 caractères et mélange majuscules, minuscules et chiffres
 *    (proxy d'entropie simple, pas un vrai calcul de Shannon).
 *
 * Ce double critère (nom suspect + valeur crédible) limite les faux positifs :
 * une locale `key = "en"`, un nom sans rapport (`userId`), ou une valeur lue
 * depuis `process.env` ne sont pas signalés.
 */

const SUSPICIOUS_NAMES = ["key", "secret", "token", "password"];
const KNOWN_KEY_PATTERNS = [/^sk_live_/, /^AKIA/, /^ghp_/, /^eyJ/];

/** Vrai si le nom de variable évoque un secret. */
function nameSuggestsSecret(name: string): boolean {
  const lower = name.toLowerCase();
  return SUSPICIOUS_NAMES.some((needle) => lower.includes(needle));
}

/** Vrai si la valeur ressemble crédiblement à un secret. */
function valueLooksLikeSecret(value: string): boolean {
  if (KNOWN_KEY_PATTERNS.some((pattern) => pattern.test(value))) {
    return true;
  }
  const hasEntropyMix =
    value.length > 20 &&
    /[a-z]/.test(value) &&
    /[A-Z]/.test(value) &&
    /[0-9]/.test(value);
  return hasEntropyMix;
}

export const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Interdit les secrets (clés d'API, tokens, mots de passe) écrits en dur dans le code.",
      recommended: true,
    },
    schema: [],
    messages: {
      hardcodedSecret:
        "Secret en dur détecté : cette valeur ressemble à une clé/token/mot de passe. Déplace-la dans une variable d'environnement (process.env) et hors du code.",
    },
  },

  create(context) {
    function checkDeclarator(declarator: VariableDeclarator): void {
      if (declarator.id.type !== "Identifier") return;
      if (!nameSuggestsSecret(declarator.id.name)) return;

      const init = declarator.init;
      if (!init || init.type !== "Literal" || typeof init.value !== "string") {
        return;
      }

      const value = init.value;
      if (value.startsWith("process.env")) return;
      if (!valueLooksLikeSecret(value)) return;

      context.report({ node: init, messageId: "hardcodedSecret" });
    }

    return {
      VariableDeclaration(node: VariableDeclaration) {
        if (node.kind !== "const" && node.kind !== "let") return;
        for (const declarator of node.declarations) {
          checkDeclarator(declarator);
        }
      },
    };
  },
};

/** Métadonnées de skill consommées par le registre (src/skills/index.ts). */
export const meta: SkillMeta = {
  id: "hardcoded-secret",
  name: "Secrets hardcodés",
  description: "API keys, tokens, passwords en clair",
  category: "security",
  severity: "critical",
  pattern: 'API_KEY = "sk-proj-a8f2..."',
  targets: "all",
};
