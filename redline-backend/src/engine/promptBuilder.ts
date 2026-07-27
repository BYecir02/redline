import type { ScanReport } from "../types/report.js";

/**
 * Construit le prompt correctif structuré envoyé à l'IA à partir d'un rapport
 * d'analyse et du code source concerné.
 *
 * Pour chaque problème : ligne, message, extrait fautif. Se termine par une
 * consigne stricte — ne renvoyer que le code corrigé, sans explication, en
 * gardant le reste du fichier inchangé — pour que la sortie soit ré-analysable.
 */
export function buildCorrectionPrompt(
  report: ScanReport,
  sourceCode: string,
): string {
  const issuesBlock = report.issues
    .map((issue, index) => {
      return [
        `Problème ${index + 1} (ligne ${issue.line}, sévérité ${issue.severity}, skill ${issue.skillId}) :`,
        `  ${issue.message}`,
        `  Code fautif : ${issue.before.trim()}`,
      ].join("\n");
    })
    .join("\n\n");

  return [
    "Tu es un outil de correction de code. On te donne un fichier et la liste des problèmes détectés par une analyse statique. Corrige chaque problème.",
    "",
    `Fichier : ${report.filename}`,
    "",
    "Problèmes à corriger :",
    issuesBlock,
    "",
    "Code source complet :",
    "```",
    sourceCode,
    "```",
    "",
    "Consignes de sortie :",
    "- Renvoie UNIQUEMENT le code corrigé, sans aucune explication ni commentaire d'accompagnement.",
    "- Garde le reste du fichier strictement inchangé ; ne modifie que ce qui est nécessaire pour résoudre les problèmes listés.",
    "- Conserve le style, l'indentation et les imports existants.",
  ].join("\n");
}
