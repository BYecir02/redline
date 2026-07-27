import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../auth/tokens.js";
import { HttpError } from "./errorHandler.js";

/**
 * Augmente `Request` avec l'identifiant de l'utilisateur authentifié.
 * Renseigné par `requireAuth` ; les contrôleurs protégés le lisent pour isoler
 * les données (chaque requête ne voit que les projets de son propriétaire).
 */
declare module "express-serve-static-core" {
  interface Request {
    userId?: string;
  }
}

/**
 * Middleware de protection : exige un `Authorization: Bearer <jwt>` valide.
 * En cas d'absence/expiration/altération → 401 (via le middleware d'erreur).
 * En cas de succès, attache `req.userId` et laisse passer.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization ?? "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    next(new HttpError(401, "Jeton d'authentification manquant."));
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    next(new HttpError(401, "Jeton invalide ou expiré."));
    return;
  }

  req.userId = payload.userId;
  next();
}
