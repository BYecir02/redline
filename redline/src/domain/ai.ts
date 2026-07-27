// Catalogue des fournisseurs d'IA (et leurs modèles) pour l'analyse à la demande.
// Choix GLOBAL pour la session : un fournisseur + un modèle + une clé, posés à
// l'étape "Clé API" du wizard. Le modèle n'influe QUE sur le bouton « Analyser »
// (l'explication contextuelle) ; la détection des problèmes reste déterministe.
//
// ENFICHABLE : ajouter un fournisseur (OpenAI, Mistral…) = une entrée dans
// AI_PROVIDERS ici (front) + un adaptateur CompletionFn dans PROVIDERS côté
// backend (engine/issueExplainer.ts). Le reste du code ne bouge pas.

export type AIProviderId = "anthropic"; // futur : | "openai" | "mistral" | ...

export type AIModel = { id: string; label: string };

export type AIProvider = {
  id: AIProviderId;
  label: string;
  models: AIModel[];
  keyPlaceholder: string;
  /** Où l'utilisateur récupère sa clé (affiché en aide sous le champ). */
  keyHelpUrl: string;
};

export const AI_PROVIDERS: AIProvider[] = [
  {
    id: "anthropic",
    label: "Anthropic (Claude)",
    keyPlaceholder: "sk-ant-api03-…",
    keyHelpUrl: "https://console.anthropic.com/settings/keys",
    models: [
      { id: "claude-opus-4-8", label: "Claude Opus 4.8 — le plus capable" },
      { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 — équilibré" },
      { id: "claude-haiku-4-5", label: "Claude Haiku 4.5 — rapide / économique" },
    ],
  },
  // { id: "openai", label: "OpenAI (GPT)", … }  ← à ajouter le jour venu
];

/** Configuration IA globale de la session. */
export type AIConfig = {
  provider: AIProviderId;
  model: string;
  apiKey: string;
};

export const DEFAULT_AI_CONFIG: AIConfig = {
  provider: "anthropic",
  model: "claude-opus-4-8",
  apiKey: "",
};

/** Retourne le fournisseur par son id (repli sur le premier si inconnu). */
export function providerById(id: string): AIProvider {
  return AI_PROVIDERS.find((p) => p.id === id) ?? AI_PROVIDERS[0];
}
