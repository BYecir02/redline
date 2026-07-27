import { hash, compare } from "bcryptjs";

/**
 * Hashage/vérification des mots de passe (bcrypt).
 * Le mot de passe en clair ne quitte jamais cette couche : on ne stocke que le
 * hash (champ `User.passwordHash`). bcrypt intègre son sel dans le hash produit.
 */

// Coût bcrypt : compromis sécurité/latence. bcryptjs est en JS pur (pas de build
// natif sous Windows) mais plus lent que le binding natif — 10 rounds (défaut de
// la lib, minimum OWASP) tient chaque hash sous ~1 s ici. À monter si on passe au
// binding natif ou sur une machine plus rapide.
const SALT_ROUNDS = 10;

/** Produit le hash bcrypt d'un mot de passe en clair. */
export function hashPassword(plain: string): Promise<string> {
  return hash(plain, SALT_ROUNDS);
}

/** Vérifie qu'un mot de passe en clair correspond à un hash bcrypt stocké. */
export function verifyPassword(plain: string, passwordHash: string): Promise<boolean> {
  return compare(plain, passwordHash);
}
