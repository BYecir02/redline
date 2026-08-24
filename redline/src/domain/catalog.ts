// Catalogue UI des huit skills réellement implémentés dans le moteur ESLint.
// Les snippets servent uniquement d'exemples visuels ; les détections affichées
// dans le dashboard proviennent toutes du backend.
import type { Skill } from "./types";

export const ALL_SKILLS: Skill[] = [
  { id: "sql-injection", name: "SQL Injection", description: "Requêtes SQL construites par concaténation", severity: "critical", category: "Sécurité", enabled: true, triggerCount: 0, pattern: 'query = "SELECT * FROM users WHERE id = " + userId', targets: "all" },
  { id: "hardcoded-secret", name: "Secrets hardcodés", description: "API keys, tokens, passwords en clair", severity: "critical", category: "Sécurité", enabled: true, triggerCount: 0, pattern: 'API_KEY = "sk-proj-a8f2..."', targets: "all" },
  { id: "xss-risk", name: "XSS potentiel", description: "Utilisation de innerHTML ou dangerouslySetInnerHTML", severity: "warning", category: "Sécurité", enabled: false, triggerCount: 0, pattern: "element.innerHTML = userInput", targets: ["javascript", "typescript", "react", "nextjs", "vue"] },
  { id: "cors-wildcard", name: "CORS trop permissif", description: "Access-Control-Allow-Origin: * en production", severity: "warning", category: "Sécurité", enabled: false, triggerCount: 0, pattern: 'res.setHeader("Access-Control-Allow-Origin", "*")', targets: ["javascript", "typescript", "express", "nestjs"] },
  { id: "console-logs", name: "Console.log oubliés", description: "Logs de debug laissés dans le code de prod", severity: "warning", category: "Qualité", enabled: true, triggerCount: 0, pattern: 'console.log("debug user:", userData)', targets: ["javascript", "typescript"] },
  { id: "todo-fixme", name: "TODO / FIXME", description: "Commentaires non résolus dans le code", severity: "info", category: "Qualité", enabled: true, triggerCount: 0, pattern: "// TODO: handle edge case when user is null", targets: "all" },
  { id: "unused-imports", name: "Imports inutilisés", description: "Modules importés mais jamais utilisés", severity: "info", category: "Qualité", enabled: false, triggerCount: 0, pattern: "import { unused } from './utils'  // jamais utilisé", targets: ["javascript", "typescript"] },
  { id: "missing-error-handling", name: "Try/catch manquant", description: "Appels async sans gestion d'erreur", severity: "warning", category: "Robustesse", enabled: false, triggerCount: 0, pattern: "const data = await fetchUser(id) // no try/catch", targets: ["javascript", "typescript"] },
];

export const SAMPLE_FILES = [
  "src/api/userController.ts", "src/db/queries.ts", "src/utils/auth.ts",
  "src/components/Form.tsx", "src/services/payment.ts", "src/hooks/useUser.ts",
  "src/routes/index.ts", "src/middleware/cors.ts", "src/lib/http.ts", "src/config.ts",
];

export const SNIPPETS: Record<string, string[]> = {
  "sql-injection": ['query = "SELECT * FROM users WHERE id = " + req.params.id', 'db.execute("DELETE FROM sessions WHERE token = " + token)'],
  "hardcoded-secret": ['const STRIPE_KEY = "sk-live-a8f2kJq9mXpL3nR7..."', 'const API_SECRET = "ghp_xK2mN9pQrT4wL8vB1..."'],
  "xss-risk": ["div.innerHTML = comment.body", "<div dangerouslySetInnerHTML={{ __html: userPost }} />"],
  "cors-wildcard": ['res.setHeader("Access-Control-Allow-Origin", "*")', "app.use(cors({ origin: '*' }))"],
  "console-logs": ['console.log("user data:", JSON.stringify(userData))', 'console.log("[DEBUG] token:", authToken)'],
  "todo-fixme": ["// TODO: validate input before passing to DB", "// FIXME: this breaks when user is undefined"],
  "unused-imports": ["import { useEffect } from 'react'  // jamais utilisé", "import lodash from 'lodash'  // jamais utilisé"],
  "missing-error-handling": ["const user = await db.findUser(id)  // unhandled rejection"],
};

export const AI_ANALYSES: Record<string, string> = {
  "sql-injection": "**Risque critique.** La concaténation directe de paramètres utilisateur dans une requête SQL permet à un attaquant d'injecter du code SQL arbitraire. Utilise des requêtes paramétrées (`?` ou `$1`) ou un ORM. Exemple corrigé : `db.query('SELECT * FROM users WHERE id = $1', [userId])`",
  "hardcoded-secret": "**Ne jamais committer une clé en clair.** Cette clé est désormais compromise si le repo est public ou partagé. Révoque-la immédiatement sur le dashboard du service concerné. Utilise des variables d'environnement (`process.env.API_KEY`) et ajoute `.env` à ton `.gitignore`.",
  "xss-risk": "**Injection XSS possible.** Injecter du HTML non sanitisé depuis une source utilisateur permet l'exécution de scripts arbitraires dans le navigateur de la victime. Utilise `DOMPurify.sanitize()` avant d'injecter, ou mieux, évite `innerHTML` et construis le DOM via l'API.",
  "cors-wildcard": "**CORS trop permissif.** `Access-Control-Allow-Origin: *` en production autorise n'importe quel site à appeler ton API depuis le navigateur d'un utilisateur authentifié. Restreins à une liste blanche d'origines de confiance.",
  "console-logs": "**Log de debug en production.** Les `console.log` peuvent exposer des données sensibles (tokens, données utilisateurs) dans les DevTools et ralentir les perfs. Supprime-les ou remplace par un logger conditionnel (`if (process.env.NODE_ENV !== 'production') console.log(...)`).",
  "todo-fixme": "**Dette technique non résolue.** Ce commentaire signale un cas non géré qui pourrait provoquer une erreur en production. Traite-le avant le déploiement ou crée un ticket de suivi avec une priorité claire.",
  "unused-imports": "**Import mort.** Un module importé mais jamais utilisé alourdit le bundle et brouille la lecture. Supprime-le — `@typescript-eslint/no-unused-vars` peut l'automatiser.",
  "missing-error-handling": "**Rejet de promesse non géré.** Une erreur réseau ou DB ici provoquera une `UnhandledPromiseRejection` qui peut crasher le process Node. Entoure d'un `try/catch` et gère l'erreur explicitement, au minimum avec un log et une réponse d'erreur appropriée.",
};
