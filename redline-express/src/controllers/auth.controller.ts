import type { NextFunction, Request, Response } from "express";
import { prisma } from "../db/client.js";
import { hashPassword, verifyPassword } from "../auth/passwords.js";
import { signToken } from "../auth/tokens.js";
import { HttpError } from "../middlewares/errorHandler.js";

type CredentialsBody = { email?: unknown; password?: unknown };

// Vue publique d'un utilisateur : jamais le hash du mot de passe.
type PublicUser = { id: string; email: string; createdAt: Date };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

/** Valide et normalise les identifiants du corps de requête. */
function parseCredentials(body: CredentialsBody): { email: string; password: string } {
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!EMAIL_RE.test(email)) {
    throw new HttpError(400, "Adresse e-mail invalide.");
  }
  if (password.length < MIN_PASSWORD) {
    throw new HttpError(400, `Le mot de passe doit faire au moins ${MIN_PASSWORD} caractères.`);
  }
  return { email, password };
}

function toPublicUser(u: { id: string; email: string; createdAt: Date }): PublicUser {
  return { id: u.id, email: u.email, createdAt: u.createdAt };
}

/**
 * POST /api/auth/signup — crée un compte.
 * Entrée : { email, password }. Sortie : { token, user }.
 * L'e-mail est unique (contrainte DB) → collision renvoyée en 409.
 */
export async function signupController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email, password } = parseCredentials(req.body as CredentialsBody);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new HttpError(409, "Un compte existe déjà pour cet e-mail.");
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({ data: { email, passwordHash } });

    res.status(201).json({ token: signToken(user.id), user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/login — authentifie un compte existant.
 * Entrée : { email, password }. Sortie : { token, user }.
 * Message d'erreur volontairement identique (e-mail inconnu vs mauvais mot de
 * passe) pour ne pas révéler quels e-mails sont enregistrés.
 */
export async function loginController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email, password } = parseCredentials(req.body as CredentialsBody);

    const user = await prisma.user.findUnique({ where: { email } });
    const ok = user ? await verifyPassword(password, user.passwordHash) : false;
    if (!user || !ok) {
      throw new HttpError(401, "E-mail ou mot de passe incorrect.");
    }

    res.json({ token: signToken(user.id), user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/me — renvoie l'utilisateur courant (route protégée).
 * `req.userId` est renseigné par `requireAuth`.
 */
export async function meController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      throw new HttpError(401, "Utilisateur introuvable.");
    }
    res.json({ user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
}
