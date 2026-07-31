import { PrismaClient } from "@prisma/client";

/**
 * Client Prisma en singleton : évite d'ouvrir une nouvelle connexion à chaque
 * rechargement à chaud (tsx watch) en le mémorisant sur globalThis en dev.
 * La connexion est paresseuse — le serveur démarre même si Postgres est down ;
 * seules les requêtes échoueront tant que la base n'est pas là.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
