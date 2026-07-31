import "dotenv/config";

/** Configuration applicative dérivée des variables d'environnement. */
export const env = {
  port: Number(process.env.PORT ?? 3001),
  databaseUrl: process.env.DATABASE_URL ?? "",
  // Secret de signature des JWT. En dev on tolère un repli (avec avertissement),
  // mais en production l'absence de JWT_SECRET doit être une erreur dure.
  jwtSecret: process.env.JWT_SECRET ?? "dev-insecure-secret-change-me",
  // Durée de validité d'un jeton d'accès.
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
} as const;

if (
  process.env.NODE_ENV === "production" &&
  (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16)
) {
  throw new Error(
    "JWT_SECRET manquant ou trop court (>= 16 caractères requis en production).",
  );
}
