import type { NextFunction, Request, Response } from "express";
import { getSummary, getTrends, type TrendBucket } from "../db/statsRepo.js";

/**
 * GET /api/stats/summary — synthèse analytique de l'utilisateur courant :
 * totaux actif/résolu, répartitions par sévérité/catégorie, top skills, MTTR,
 * nombre de récurrences. `req.userId` est garanti par `requireAuth`.
 */
export async function summaryController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const projectPath = typeof req.query.projectPath === "string" ? req.query.projectPath : undefined;
    res.json(await getSummary(req.userId!, projectPath));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/stats/trends?bucket=hour|day&limit=N — tendances horodatées des
 * événements (apparitions / résolutions / réouvertures) de l'utilisateur.
 */
export async function trendsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const q = req.query.bucket;
    const bucket: TrendBucket = q === "day" ? "day" : q === "minute" ? "minute" : "hour";
    const rawLimit = Number(req.query.limit);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 200) : 24;
    const projectPath = typeof req.query.projectPath === "string" ? req.query.projectPath : undefined;
    res.json(await getTrends(req.userId!, bucket, limit, projectPath));
  } catch (err) {
    next(err);
  }
}
