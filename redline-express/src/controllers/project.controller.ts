import type { NextFunction, Request, Response } from "express";
import { listProjects } from "../db/projectRepo.js";

/**
 * GET /api/projects — historique des sessions de l'utilisateur courant :
 * dossiers déjà surveillés, compteurs actif/résolu et dernière activité.
 * `req.userId` est garanti par `requireAuth`.
 */
export async function listProjectsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    res.json(await listProjects(req.userId!));
  } catch (err) {
    next(err);
  }
}
