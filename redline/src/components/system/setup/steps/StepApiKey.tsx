// Étape 4 — configuration IA globale de la session : fournisseur + modèle + clé.
// Choix unique valable pour toute la session ; il n'agit que sur le bouton
// « Analyser » (l'explication contextuelle), la détection restant déterministe.
import { Key, Eye, EyeOff, Info, ArrowRight } from "lucide-react";
import { AI_PROVIDERS, providerById, type AIConfig } from "../../../../domain/ai";

export function StepApiKey({
  ai, onAiChange, showKey, onToggleShowKey, onBack, onNext,
}: {
  ai: AIConfig;
  onAiChange: (next: AIConfig) => void;
  showKey: boolean;
  onToggleShowKey: () => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const provider = providerById(ai.provider);

  return (
    <div className="space-y-4">
      <div className="border border-border rounded bg-card p-5 space-y-5">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary/10 rounded">
            <Key className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="text-sm font-medium text-foreground mb-1">Analyse par IA</div>
            <div className="text-xs text-muted-foreground leading-relaxed">
              Redline utilise un modèle pour expliquer les alertes à la demande. Choisis ton fournisseur et ton modèle&nbsp;; ta clé reste stockée localement, elle n'est jamais envoyée ailleurs que vers l'API du fournisseur.
            </div>
          </div>
        </div>

        {/* Fournisseur + modèle */}
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1.5">
            <span className="text-xs text-muted-foreground uppercase tracking-widest">Fournisseur</span>
            <select
              value={ai.provider}
              onChange={(e) => {
                const next = providerById(e.target.value);
                onAiChange({ ...ai, provider: next.id, model: next.models[0]?.id ?? "" });
              }}
              className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors"
            >
              {AI_PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-xs text-muted-foreground uppercase tracking-widest">Modèle</span>
            <select
              value={ai.model}
              onChange={(e) => onAiChange({ ...ai, model: e.target.value })}
              className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors"
            >
              {provider.models.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </label>
        </div>

        {/* Clé API */}
        <div className="relative">
          <input
            type={showKey ? "text" : "password"}
            value={ai.apiKey}
            onChange={(e) => onAiChange({ ...ai, apiKey: e.target.value })}
            placeholder={provider.keyPlaceholder}
            className="w-full bg-background border border-border rounded px-3 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 transition-colors pr-10"
          />
          <button
            onClick={onToggleShowKey}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground"
          >
            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded px-3 py-2.5">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>Tu peux aussi sauter cette étape - l'analyse IA sera désactivée mais tout le reste fonctionne normalement.</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Retour</button>
        <div className="flex gap-2">
          <button onClick={onNext} className="px-4 py-2 text-sm border border-border rounded text-muted-foreground hover:text-foreground transition-colors">
            Passer cette étape
          </button>
          <button onClick={onNext} className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity">
            Continuer <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
