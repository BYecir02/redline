import type { NextFunction, Request, Response } from "express";
import { setIgnored, restoreAllIgnored, listIgnored } from "../db/ignoreRepo.js";
import { HttpError } from "../middlewares/errorHandler.js";

/** GET /api/detections/ignored — signatures ignorées de l'utilisateur. */
export async function listIgnoredController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    res.json(await listIgnored(req.userId!));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/detections/ignore — marque une détection comme ignorée.
 * Entrée : { projectPath, signature }. Idempotent ; { matched } indique si une
 * détection persistée correspondait (le front garde son ignore local sinon).
 */
export async function ignoreController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { projectPath, signature } = req.body as { projectPath?: unknown; signature?: unknown };
    if (typeof projectPath !== "string" || projectPath.length === 0) {
      throw new HttpError(400, "`projectPath` est requis.");
    }
    if (typeof signature !== "string" || signature.length === 0) {
      throw new HttpError(400, "`signature` est requise.");
    }
    const matched = await setIgnored(req.userId!, projectPath, signature, true);
    res.json({ matched });
  } catch (err) {
    next(err);
  }
}

/** POST /api/detections/restore-all — restaure toutes les détections ignorées. */
export async function restoreAllController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await restoreAllIgnored(req.userId!);
    res.json({ status: "restored" });
  } catch (err) {
    next(err);
  }
}
