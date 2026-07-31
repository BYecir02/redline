import type { Rule } from "eslint";
import type { SkillMeta } from "../../types/report.js";
import type {
  Node,
  CallExpression,
  MemberExpression,
  Expression,
} from "estree";

/**
 * Skill N3 (framework/backend) — détection d'injection SQL.
 *
 * Signale un appel `.query(...)` ou `.execute(...)` dont le PREMIER argument est
 * une chaîne construite dynamiquement (concaténation `+` ou template literal)
 * qui incorpore une entrée utilisateur non filtrée : `req.body`, `req.query`
 * ou `req.params`.
 *
 * Deux formes couvertes :
 *  - directe   : `db.query("... " + req.body.id)` — la concat est l'argument.
 *  - indirecte : `const q = "... " + req.body.id; db.query(q)` — l'argument est
 *    une variable dont on résout la déclaration (voir limite de portée ci-dessous).
 *
 * ⚠️ Limite de portée assumée (à expliquer en soutenance) : la résolution de
 * variable est volontairement minimale — MONO-NIVEAU (une seule indirection),
 * dans le MÊME BLOC uniquement (on ne remonte pas aux portées parentes), SANS
 * traversée de fonctions et SANS analyse de flux complète. C'est un compromis
 * précision / faux positifs, pas un moteur de taint-tracking. Conséquence
 * connue : `const q = ...; function h(){ db.query(q) }` n'est pas signalé (la
 * déclaration est dans un bloc parent), pas plus qu'une valeur construite via
 * un appel de fonction (`db.query(build(req))`).
 *
 * Ne signale PAS une requête paramétrée — string statique + valeurs passées
 * séparément dans un tableau, ex. `db.query("... WHERE id = ?", [req.body.id])` —
 * car l'entrée utilisateur n'est alors pas dans le premier argument.
 */

const SINK_METHODS = new Set(["query", "execute"]);
const USER_INPUT_SOURCES = new Set(["body", "query", "params"]);

/** Vrai si le nœud est un accès `req.body` / `req.query` / `req.params`. */
function isReqInputMember(node: Node): node is MemberExpression {
  return (
    node.type === "MemberExpression" &&
    node.object.type === "Identifier" &&
    node.object.name === "req" &&
    node.property.type === "Identifier" &&
    USER_INPUT_SOURCES.has(node.property.name)
  );
}

/**
 * Parcourt récursivement un sous-arbre AST à la recherche d'une référence à une
 * entrée utilisateur (`req.body`, etc.). Couvre les concaténations imbriquées
 * (`a + req.body.x + b`) et les template literals (`\`...${req.query.y}...\``).
 */
function containsUserInput(node: Node | null | undefined): boolean {
  if (!node || typeof node.type !== "string") return false;
  if (isReqInputMember(node)) return true;

  for (const key of Object.keys(node)) {
    if (key === "parent") continue;
    const value = (node as unknown as Record<string, unknown>)[key];

    if (Array.isArray(value)) {
      for (const child of value) {
        if (child && typeof child === "object" && containsUserInput(child as Node)) {
          return true;
        }
      }
    } else if (value && typeof value === "object" && "type" in value) {
      if (containsUserInput(value as Node)) return true;
    }
  }
  return false;
}

/**
 * Vrai si l'argument est une chaîne construite dynamiquement :
 * - concaténation par `+` (potentiellement imbriquée), ou
 * - template literal (avec au moins une interpolation).
 */
function isDynamicString(arg: Expression): boolean {
  if (arg.type === "TemplateLiteral") {
    return arg.expressions.length > 0;
  }
  if (arg.type === "BinaryExpression" && arg.operator === "+") {
    return true;
  }
  return false;
}

export const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Interdit les requêtes SQL construites par concaténation ou template literal à partir d'une entrée utilisateur (req.body/query/params).",
      recommended: true,
    },
    schema: [],
    messages: {
      sqlInjection:
        "Injection SQL potentielle : requête construite dynamiquement à partir d'une entrée utilisateur (req.body/query/params). Utilise une requête paramétrée (placeholders + tableau de valeurs).",
    },
  },

  create(context) {
    const sourceCode = context.sourceCode;

    /** Corps (liste de statements) du bloc englobant le plus proche, sinon null. */
    function nearestBlockBody(node: Node): Node[] | null {
      const ancestors = sourceCode.getAncestors(node);
      for (let i = ancestors.length - 1; i >= 0; i--) {
        const ancestor = ancestors[i];
        if (ancestor.type === "BlockStatement" || ancestor.type === "Program") {
          return ancestor.body as unknown as Node[];
        }
      }
      return null;
    }

    /**
     * Résolution mono-niveau, même bloc : cherche `const`/`let <name> = <init>`
     * dans le bloc englobant du nœud et renvoie l'initialiseur, sinon null.
     */
    function resolveSameBlockInit(name: string, node: Node): Expression | null {
      const body = nearestBlockBody(node);
      if (!body) return null;
      for (const statement of body) {
        if (statement.type !== "VariableDeclaration") continue;
        if (statement.kind !== "const" && statement.kind !== "let") continue;
        for (const declarator of statement.declarations) {
          if (declarator.id.type === "Identifier" && declarator.id.name === name) {
            return declarator.init ?? null;
          }
        }
      }
      return null;
    }

    return {
      CallExpression(node: CallExpression) {
        const callee = node.callee;
        if (
          callee.type !== "MemberExpression" ||
          callee.property.type !== "Identifier" ||
          !SINK_METHODS.has(callee.property.name)
        ) {
          return;
        }

        const firstArg = node.arguments[0];
        if (!firstArg || firstArg.type === "SpreadElement") return;

        // Cas direct : la chaîne dynamique est directement l'argument.
        if (firstArg.type !== "Identifier") {
          if (isDynamicString(firstArg) && containsUserInput(firstArg as Node)) {
            context.report({ node: firstArg, messageId: "sqlInjection" });
          }
          return;
        }

        // Cas indirect : l'argument est une variable → résolution mono-niveau, même bloc.
        const init = resolveSameBlockInit(firstArg.name, node);
        if (init && isDynamicString(init) && containsUserInput(init as Node)) {
          context.report({ node: firstArg, messageId: "sqlInjection" });
        }
      },
    };
  },
};

/** Métadonnées de skill consommées par le registre (src/skills/index.ts). */
export const meta: SkillMeta = {
  id: "sql-injection",
  name: "SQL Injection",
  description: "Requêtes SQL construites par concaténation",
  category: "security",
  severity: "critical",
  pattern: 'query = "SELECT * FROM users WHERE id = " + userId',
  targets: "all",
};
