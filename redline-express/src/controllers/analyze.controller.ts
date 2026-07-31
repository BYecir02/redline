import type { NextFunction, Request, Response } from "express";
import { explainIssue } from "../engine/issueExplainer.js";
import { HttpError } from "../middlewares/errorHandler.js";

type AnalyzeBody = {
  apiKey?: unknown;
  provider?: unknown;
  model?: unknown;
  skillName?: unknown;
  category?: unknown;
  severity?: unknown;
  filename?: unknown;
  line?: unknown;
  snippet?: unknown;
};

/**
 * POST /api/analyze
 * Analyse IA à la demande d'un problème détecté.
 * Entrée : { apiKey, skillName, snippet, provider?, model?, category?, severity?, filename?, line? }
 * Sortie : { analysis: string }
 *
 * La clé API vient de l'utilisateur (le front ne l'appelle que si une clé existe ;
 * sinon il affiche une analyse de démo locale).
 */
export async function analyzeIssueController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const b = req.body as AnalyzeBody;

    if (typeof b.apiKey !== "string" || b.apiKey.length === 0) {
      throw new HttpError(400, "`apiKey` est requis pour l'analyse IA.");
    }
    if (typeof b.skillName !== "string" || b.skillName.length === 0) {
      throw new HttpError(400, "`skillName` est requis.");
    }
    if (typeof b.snippet !== "string" || b.snippet.length === 0) {
      throw new HttpError(400, "`snippet` est requis.");
    }

    const analysis = await explainIssue(
      {
        skillName: b.skillName,
        category: typeof b.category === "string" ? b.category : "",
        severity: typeof b.severity === "string" ? b.severity : "",
        filename: typeof b.filename === "string" ? b.filename : "",
        line: typeof b.line === "number" ? b.line : 0,
        snippet: b.snippet,
      },
      {
        provider: typeof b.provider === "string" ? b.provider : "anthropic",
        model: typeof b.model === "string" ? b.model : "",
        apiKey: b.apiKey,
      },
    );

    res.json({ analysis });
  } catch (err) {
    if (err instanceof HttpError) {
      next(err);
      return;
    }
    // Échec côté Anthropic (clé invalide, réseau…) → 502 lisible.
    next(new HttpError(502, `Analyse IA échouée : ${(err as Error).message}`));
  }
}
