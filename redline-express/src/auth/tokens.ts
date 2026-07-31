import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

/**
 * Émission/vérification des jetons d'accès (JWT signés HS256).
 * Le jeton ne transporte que l'identifiant de l'utilisateur (`sub`) — aucune
 * donnée sensible. Toute la confiance repose sur la signature (JWT_SECRET).
 */

export type TokenPayload = { userId: string };

/** Signe un jeton d'accès pour un utilisateur donné. */
export function signToken(userId: string): string {
  const options: jwt.SignOptions = {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"],
  };
  return jwt.sign({ sub: userId }, env.jwtSecret, options);
}

/**
 * Vérifie un jeton et renvoie son payload, ou `null` si invalide/expiré.
 * Ne lève pas : l'appelant décide de la réponse HTTP (401).
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    if (typeof decoded === "string" || typeof decoded.sub !== "string") {
      return null;
    }
    return { userId: decoded.sub };
  } catch {
    return null;
  }
}
