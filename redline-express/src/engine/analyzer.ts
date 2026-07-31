import { randomUUID } from "node:crypto";
import { ESLint } from "eslint";
import tsParser from "@typescript-eslint/parser";
import { getSkills } from "../skills/index.js";
import type { Issue, ScanReport } from "../types/report.js";

const PLUGIN_NAMESPACE = "redline";

/**
 * Cœur du moteur : analyse un fichier contre les skills demandés.
 *
 * Étapes :
 *  1. résout les skills depuis le registre ;
 *  2. les enregistre comme un plugin ESLint monté à la volée (flat config) ;
 *  3. lance ESLint.lintText() sur le code fourni ;
 *  4. traduit les messages ESLint en ScanReport (contrat front).
 *
 * Volontairement découplé du framework : il ne connaît que des règles ESLint et
 * le type ScanReport. Ajouter un langage/framework = ajouter des skills.
 */
export async function analyzeCode(
  code: string,
  filename: string,
  skillIds: string[],
): Promise<ScanReport> {
  const selected = getSkills(skillIds);

  // Aucun skill valide → rapport vide, pas d'appel ESLint inutile.
  if (selected.length === 0) {
    return { filename, issues: [], scannedAt: new Date().toISOString() };
  }

  const pluginRules = Object.fromEntries(
    selected.map((skill) => [skill.id, skill.rule]),
  );
  const rulesConfig = Object.fromEntries(
    selected.map((skill) => [`${PLUGIN_NAMESPACE}/${skill.id}`, "error" as const]),
  );

  const eslint = new ESLint({
    // On ignore tout fichier de config sur disque : la config est 100 % en mémoire.
    overrideConfigFile: true,
    overrideConfig: [
      {
        files: ["**/*.{js,jsx,ts,tsx,mjs,cjs}"],
        languageOptions: {
          parser: tsParser,
          parserOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
          },
        },
        plugins: {
          [PLUGIN_NAMESPACE]: { rules: pluginRules },
        },
        rules: rulesConfig,
      },
    ],
  });

  const results = await eslint.lintText(code, { filePath: filename });
  const sourceLines = code.split("\n");

  const issues: Issue[] = [];
  for (const result of results) {
    for (const message of result.messages) {
      if (!message.ruleId) continue;

      const skillId = message.ruleId.replace(`${PLUGIN_NAMESPACE}/`, "");
      const skill = selected.find((s) => s.id === skillId);
      if (!skill) continue;

      issues.push({
        id: randomUUID(),
        skillId: skill.id,
        category: skill.category,
        severity: skill.severity,
        line: message.line,
        message: message.message,
        before: sourceLines[message.line - 1] ?? "",
      });
    }
  }

  return {
    filename,
    issues,
    scannedAt: new Date().toISOString(),
  };
}
