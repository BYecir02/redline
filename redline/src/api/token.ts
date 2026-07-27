// Stockage du jeton d'accès (JWT) émis par le backend à la connexion.
// Isolé dans son propre module (sans dépendance) pour être importé aussi bien par
// le client HTTP (qui l'ajoute en en-tête) que par la couche auth, sans cycle.
const TOKEN_KEY = "redline.token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* stockage indisponible : le jeton ne survivra pas au refresh */
  }
}
