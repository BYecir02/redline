// Génération du prompt de correction à partir des alertes sélectionnées.
// Fonction pure (aucune dépendance React/UI) : testable isolément.
import type { Alert, Skill } from "./types";
import { SEV_LABEL } from "./severity";

/**
 * Construit le prompt correctif (Markdown) à copier vers l'assistant IA.
 * @param selected alertes retenues par l'utilisateur
 * @param skills   catalogue de skills (pour retrouver nom / description / sévérité)
 */
export function buildFixPrompt(selected: Alert[], skills: Skill[]): string {
  const lines: string[] = [
    "Tu viens de travailler sur ce projet et Redline a détecté les problèmes suivants dans ton code. Corrige chacun d'eux précisément.",
    "",
    `Nombre de problèmes détectés : ${selected.length}`,
    "",
    "---",
    "",
  ];
  selected.forEach((alert, i) => {
    const skill = skills.find((s) => s.id === alert.skillId);
    if (!skill) return;
    lines.push(`## Problème ${i + 1} - ${skill.name} (${SEV_LABEL[skill.severity]})`);
    lines.push(`**Fichier :** \`${alert.folderPath}/${alert.file}\``);
    lines.push(`**Type :** ${skill.description}`);
    lines.push(`**Code détecté :**`);
    lines.push(`\`\`\``);
    lines.push(alert.snippet);
    lines.push(`\`\`\``);
    if (alert.analysis) {
      lines.push(`**Contexte :** ${alert.analysis.replace(/\*\*/g, "").replace(/`/g, "")}`);
    }
    lines.push("");
  });
  lines.push("---");
  lines.push("");
  lines.push("Pour chaque problème, indique clairement quel fichier tu modifies et montre le code corrigé.");
  return lines.join("\n");
}
