import type { NextFunction, Request, Response } from "express";

/** Erreur applicative portant un code HTTP (ex. validation → 400). */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/**
 * Middleware d'erreur central (doit être monté en dernier).
 * Traduit une HttpError en réponse typée, sinon renvoie un 500 générique.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- signature à 4 args requise par Express
  _next: NextFunction,
): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  console.error(err);
  res.status(500).json({ error: "Internal server error" });
}
