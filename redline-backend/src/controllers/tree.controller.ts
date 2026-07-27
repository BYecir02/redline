import { existsSync, statSync } from "node:fs";
import type { NextFunction, Request, Response } from "express";
import { readDirTree } from "../engine/dirTree.js";
import { HttpError } from "../middlewares/errorHandler.js";

/**
 * POST /api/tree
 * Entrée : { path: string (dossier existant) }
 * Sortie : { tree: TreeNode[] } — l'arborescence réelle des sous-dossiers, lue du
 * disque, en profondeur complète. Sert à peupler la sélection de sous-dossiers.
 */
export function treeController(req: Request, res: Response, next: NextFunction): void {
  try {
    const { path: dirPath } = req.body as { path?: unknown };

    if (typeof dirPath !== "string" || dirPath.length === 0) {
      throw new HttpError(400, "`path` est requis et doit être une chaîne non vide.");
    }
    if (!existsSync(dirPath) || !statSync(dirPath).isDirectory()) {
      throw new HttpError(400, "`path` doit être un dossier existant.");
    }

    res.json({ tree: readDirTree(dirPath) });
  } catch (err) {
    next(err);
  }
}
