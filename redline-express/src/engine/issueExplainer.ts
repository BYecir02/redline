import Anthropic from "@anthropic-ai/sdk";

/**
 * Analyse IA à la demande d'un problème détecté : le modèle explique pourquoi
 * c'est risqué et comment corriger. La clé API vient de l'utilisateur (jamais
 * stockée côté serveur, transmise à chaque requête).
 *
 * Structure ENFICHABLE par fournisseur : ajouter OpenAI/Mistral/etc. = une entrée
 * dans `PROVIDERS` (un adaptateur `CompletionFn`), sans toucher au reste. Pour
 * l'instant seul Anthropic est implémenté.
 *
 * Distinct de aiClient.ts (correction en boucle, mis de côté) : ici on explique.
 */

export type IssueContext = {
  skillName: string;
  category: string;
  severity: string;
  filename: string;
  line: number;
  snippet: string;
};

/** Requête IA : fournisseur + modèle + clé de l'utilisateur. */
export type AIRequest = { provider: string; model: string; apiKey: string };

/** Modèle par défaut si non précisé, par fournisseur. */
const DEFAULT_MODEL: Record<string, string> = {
  anthropic: "claude-opus-4-8",
};

/** Un adaptateur de complétion : même signature quel que soit le fournisseur. */
type CompletionFn = (opts: { model: string; apiKey: string; prompt: string }) => Promise<string>;

const anthropicComplete: CompletionFn = async ({ model, apiKey, prompt }) => {
  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model,
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });
  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();
};

/** Registre des fournisseurs supportés. Ajouter un fournisseur = une entrée ici. */
const PROVIDERS: Record<string, CompletionFn> = {
  anthropic: anthropicComplete,
  // openai: openaiComplete,   ← à ajouter le jour venu
};

function buildPrompt(ctx: IssueContext): string {
  return [
    "Tu es un expert en revue de code. Un outil d'analyse statique a détecté un problème.",
    "Explique en 2 à 4 phrases, en français :",
    "1. pourquoi c'est un risque ;",
    "2. comment le corriger (avec un court exemple de code corrigé si pertinent).",
    "Sois concis et concret. Utilise du markdown léger (gras pour l'essentiel, `code` inline).",
    "",
    `Skill : ${ctx.skillName} (catégorie ${ctx.category}, sévérité ${ctx.severity})`,
    `Fichier : ${ctx.filename}:${ctx.line}`,
    "Code détecté :",
    "```",
    ctx.snippet,
    "```",
  ].join("\n");
}

export async function explainIssue(ctx: IssueContext, req: AIRequest): Promise<string> {
  if (!req.apiKey) {
    throw new Error("Clé API requise pour l'analyse.");
  }
  const complete = PROVIDERS[req.provider];
  if (!complete) {
    throw new Error(`Fournisseur IA non supporté : ${req.provider}`);
  }
  const model = req.model || DEFAULT_MODEL[req.provider] || "";
  return complete({ model, apiKey: req.apiKey, prompt: buildPrompt(ctx) });
}
