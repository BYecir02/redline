/**
 * ⚠️ MIS DE CÔTÉ — hors du chemin principal.
 *
 * Le flux actuel ne fait PAS appeler l'API Anthropic par l'outil : il génère un
 * prompt correctif (voir promptBuilder + POST /api/generate-fix-prompt) que
 * l'utilisateur colle dans sa propre session d'assistant IA. Ce client est
 * conservé pour un futur mode automatique (correction en boucle côté serveur)
 * et n'est branché sur aucune route pour l'instant.
 */
import Anthropic from "@anthropic-ai/sdk";

/** Modèle IA utilisé pour générer les corrections. */
const MODEL = "claude-sonnet-4-6";

/** Extrait le code d'un bloc markdown ```...``` si présent, sinon renvoie le texte brut. */
function extractCode(text: string): string {
  const fenced = text.match(/```(?:[\w-]*)\n?([\s\S]*?)```/);
  if (fenced && fenced[1] !== undefined) {
    return fenced[1].trim();
  }
  return text.trim();
}

/**
 * Envoie le prompt correctif à l'IA et retourne le code corrigé.
 *
 * Isole le reste du moteur du fournisseur concret : le loop ne connaît que
 * cette signature. Lève une erreur explicite si la clé API est absente, plutôt
 * qu'un échec silencieux en cours d'exécution.
 */
export async function requestFix(prompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY manquante : renseigne-la dans .env (voir .env.example) pour activer la correction IA.",
    );
  }

  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    messages: [{ role: "user", content: prompt }],
  });

  // Concatène les blocs texte de la réponse.
  const text = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  return extractCode(text);
}
