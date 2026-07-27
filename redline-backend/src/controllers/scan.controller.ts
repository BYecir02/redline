import type { NextFunction, Request, Response } from "express";
import { analyzeCode } from "../engine/analyzer.js";
import { buildCorrectionPrompt } from "../engine/promptBuilder.js";
import { persistScan } from "../db/detectionRepo.js";
import { upsertProjectConfig } from "../db/projectRepo.js";
import { skills } from "../skills/index.js";
import { HttpError } from "../middlewares/errorHandler.js";

type RequestBody = {
  code?: unknown;
  filename?: unknown;
  skills?: unknown;
  /** Optionnel : dossier racine (mode navigateur) → active la persistance. */
  projectPath?: unknown;
  /** Optionnel : sous-dossiers exclus (mode navigateur) → mémorisés pour la reprise. */
  exclude?: unknown;
};

/** Valide les champs communs { code, filename, skills } et les renvoie typés. */
function validateBase(body: RequestBody): {
  code: string;
  filename: string;
  skills: string[];
} {
  const { code, filename, skills } = body;

  if (typeof code !== "string" || code.length === 0) {
    throw new HttpError(400, "`code` est requis et doit être une chaîne non vide.");
  }
  if (typeof filename !== "string" || filename.length === 0) {
    throw new HttpError(400, "`filename` est requis et doit être une chaîne non vide.");
  }
  if (!Array.isArray(skills) || skills.length === 0) {
    throw new HttpError(400, "`skills` est requis et doit être un tableau non vide.");
  }
  if (!skills.every((s) => typeof s === "string")) {
    throw new HttpError(400, "`skills` doit contenir uniquement des chaînes.");
  }

  return { code, filename, skills: skills as string[] };
}

/**
 * GET /api/skills
 * Renvoie le catalogue complet des skills (contrat SkillMeta) consommé par l'UI :
 * { id, name, description, category, severity, pattern, targets }.
 * On n'expose PAS le champ `rule` (la règle ESLint) : c'est un détail moteur.
 */
export function listSkillsController(_req: Request, res: Response): void {
  const list = Object.values(skills).map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    category: s.category,
    severity: s.severity,
    pattern: s.pattern,
    targets: s.targets,
  }));
  res.json(list);
}

/**
 * POST /api/scan
 * Entrée : { code: string, filename: string, skills: string[] (non vide) }
 * Sortie : ScanReport (voir src/types/report.ts).
 */
export async function scanController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as RequestBody;
    const { code, filename, skills } = validateBase(body);
    const report = await analyzeCode(code, filename, skills);

    // Persistance optionnelle : seulement si un dossier racine est fourni et
    // l'utilisateur authentifié (mode navigateur). N'interrompt jamais la réponse.
    const projectPath = body.projectPath;
    if (typeof projectPath === "string" && projectPath.length > 0 && req.userId) {
      try {
        await persistScan(req.userId, projectPath, report);
        // Mémorise aussi la config (skills + exclusions) du projet pour la reprise.
        const exclude = Array.isArray(body.exclude) && body.exclude.every((e) => typeof e === "string")
          ? (body.exclude as string[])
          : undefined;
        await upsertProjectConfig(req.userId, projectPath, { skills, excluded: exclude });
      } catch (err) {
        console.error("[scan] persistance échouée:", (err as Error).message);
      }
    }

    res.json(report);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/generate-fix-prompt
 *
 * L'outil ne corrige pas lui-même : il produit un prompt correctif que
 * l'utilisateur copie-colle dans sa propre session d'assistant IA (terminal), qui
 * a accès au repo et applique les corrections.
 *
 * Entrée : { code, filename, skills }
 * Sortie : { prompt: string | null, report: ScanReport }
 *          prompt vaut null quand il n'y a aucun problème à corriger.
 */
export async function generateFixPromptController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { code, filename, skills } = validateBase(req.body as RequestBody);
    const report = await analyzeCode(code, filename, skills);
    const prompt =
      report.issues.length === 0 ? null : buildCorrectionPrompt(report, code);
    res.json({ prompt, report });
  } catch (err) {
    next(err);
  }
}
