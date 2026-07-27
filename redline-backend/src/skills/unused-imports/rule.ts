import type { Rule } from "eslint";
import type { SkillMeta } from "../../types/report.js";
import type { ImportDeclaration, Identifier } from "estree";

/**
 * Skill N2 (JS/TS, qualité) — import inutilisé.
 *
 * Recense les liaisons importées puis vérifie si leur nom réapparaît ailleurs
 * comme identifiant (y compris en JSX, ex. `<Button/>`, pour ne pas signaler à
 * tort un composant importé). Un nom qui n'apparaît que dans son import est
 * considéré comme inutilisé.
 *
 * Approche volontairement conservatrice (on compte tout identifiant homonyme
 * comme un usage) : privilégie l'absence de faux positifs à l'exhaustivité.
 */

export const rule: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Signale les modules importés mais jamais utilisés.",
      recommended: true,
    },
    schema: [],
    messages: {
      unusedImport:
        "Import inutilisé : `{{name}}` est importé mais jamais utilisé — supprime-le.",
    },
  },

  create(context) {
    // Nom importé -> nœud à signaler (l'identifiant local de l'import).
    const imported = new Map<string, Identifier>();
    // Les identifiants qui SONT la déclaration d'import (à ne pas compter comme usage).
    const importLocalNodes = new Set<unknown>();
    // Tous les noms utilisés ailleurs (Identifier + JSXIdentifier).
    const used = new Set<string>();

    return {
      ImportDeclaration(node: ImportDeclaration) {
        for (const spec of node.specifiers) {
          imported.set(spec.local.name, spec.local);
          importLocalNodes.add(spec.local);
          // Un import nommé a un 2e nœud Identifier (`imported`) à ne pas compter
          // comme usage : `import { foo }` → nœuds `foo` (imported) ET `foo` (local).
          if (spec.type === "ImportSpecifier") {
            importLocalNodes.add(spec.imported);
          }
        }
      },
      Identifier(node: Identifier) {
        if (!importLocalNodes.has(node)) used.add(node.name);
      },
      // Usage en JSX (`<Button/>`) : JSXIdentifier porte aussi un `.name`.
      JSXIdentifier(node: Identifier) {
        used.add(node.name);
      },
      "Program:exit"() {
        for (const [name, localNode] of imported) {
          if (!used.has(name)) {
            context.report({ node: localNode, messageId: "unusedImport", data: { name } });
          }
        }
      },
    };
  },
};

/** Métadonnées de skill consommées par le registre (src/skills/index.ts). */
export const meta: SkillMeta = {
  id: "unused-imports",
  name: "Imports inutilisés",
  description: "Modules importés mais jamais utilisés",
  category: "quality",
  severity: "info",
  pattern: "import { unused } from './utils'  // jamais utilisé",
  targets: ["javascript", "typescript"],
};
