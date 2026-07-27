// Appels d'authentification vers le backend (/api/auth) + gestion du jeton local.
import { API_URL, authHeaders } from "./client";
import { getToken, setToken } from "./token";

/** Vue publique d'un utilisateur (jamais de hash côté client). */
export type AuthUser = { id: string; email: string; createdAt: string };

type AuthResponse = { token: string; user: AuthUser };

/** POST vers /auth/*, en remontant le message d'erreur métier du backend. */
async function authRequest(path: string, body: unknown): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/auth${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as Partial<AuthResponse> & { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? `Échec (${res.status}).`);
  }
  return data as AuthResponse;
}

/** Crée un compte puis mémorise le jeton. */
export async function signup(email: string, password: string): Promise<AuthUser> {
  const { token, user } = await authRequest("/signup", { email, password });
  setToken(token);
  return user;
}

/** Connecte un compte existant puis mémorise le jeton. */
export async function login(email: string, password: string): Promise<AuthUser> {
  const { token, user } = await authRequest("/login", { email, password });
  setToken(token);
  return user;
}

/**
 * Valide le jeton courant et renvoie l'utilisateur, ou null si absent/expiré.
 * Utilisé au démarrage pour restaurer la session sans redemander le mot de passe.
 */
export async function fetchMe(): Promise<AuthUser | null> {
  if (!getToken()) return null;
  const res = await fetch(`${API_URL}/auth/me`, { headers: authHeaders() });
  if (!res.ok) {
    setToken(null); // jeton invalide/expiré : on l'oublie
    return null;
  }
  const data = (await res.json()) as { user: AuthUser };
  return data.user;
}

/** Déconnecte : oublie simplement le jeton (JWT sans état côté serveur). */
export function logout(): void {
  setToken(null);
}
