/**
 * ⚠️ MIS DE CÔTÉ — hors du chemin principal.
 *
 * Boucle de correction 100 % automatique (analyse → prompt → appel IA →
 * re-analyse). Le flux actuel s'arrête à la génération du prompt
 * (POST /api/generate-fix-prompt) : c'est l'utilisateur qui applique la
 * correction via sa session d'assistant IA. Cette boucle est conservée pour un
 * futur mode automatique et n'est branchée sur aucune route pour l'instant.
 */
import type { ScanReport } from "../types/report.js";
import { analyzeCode } from "./analyzer.js";
import { buildCorrectionPrompt } from "./promptBuilder.js";
import { requestFix } from "./aiClient.js";

export type CorrectionLoopResult = {
  /** Code final après convergence (ou dernier état si limite atteinte). */
  code: string;
  /** Rapport de la dernière analyse. */
  report: ScanReport;
  /** Nombre de corrections IA effectuées. */
  attempts: number;
  /** true si plus aucun problème, false si arrêt sur limite de tentatives. */
  converged: boolean;
};

/**
 * Boucle analyse → prompt → correction IA → re-analyse, jusqu'à validation ou
 * jusqu'à `maxAttempts` corrections (garde-fou anti-boucle infinie → au-delà,
 * on rend la main pour une revue manuelle).
 *
 * Si la première analyse ne trouve rien, retourne converged=true sans appeler
 * l'IA. Sinon corrige, re-analyse, et répète. Si la limite est atteinte sans
 * convergence, retourne converged=false avec le dernier état obtenu.
 */
export async function runCorrectionLoop(
  code: string,
  filename: string,
  skillIds: string[],
  maxAttempts = 3,
): Promise<CorrectionLoopResult> {
  let currentCode = code;
  let report = await analyzeCode(currentCode, filename, skillIds);
  let attempts = 0;

  while (report.issues.length > 0) {
    if (attempts >= maxAttempts) {
      return { code: currentCode, report, attempts, converged: false };
    }

    const prompt = buildCorrectionPrompt(report, currentCode);
    currentCode = await requestFix(prompt);
    attempts += 1;

    report = await analyzeCode(currentCode, filename, skillIds);
  }

  return { code: currentCode, report, attempts, converged: true };
}
