// Modale de configuration IA depuis le dashboard : fournisseur + modèle + clé.
// Mêmes champs que l'étape 4 du wizard, éditables à tout moment. On travaille sur
// un brouillon local ; « Enregistrer » remonte la config (persistée par App.tsx).
import { useState } from "react";
import { Key, Eye, EyeOff, X } from "lucide-react";
import { AI_PROVIDERS, providerById, type AIConfig } from "../../../domain/ai";

export function AiSettingsModal({
  ai, onSave, onClose,
}: {
  ai: AIConfig;
  onSave: (next: AIConfig) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<AIConfig>(ai);
  const [showKey, setShowKey] = useState(false);
  const provider = providerById(draft.provider);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-medium text-foreground flex items-center gap-2">
            <Key className="w-4 h-4 text-primary" /> Analyse par IA
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Choisis ton fournisseur et ton modèle. Ta clé reste stockée localement, elle n'est jamais envoyée ailleurs que vers l'API du fournisseur. Laisse la clé vide pour désactiver l'analyse IA (le reste fonctionne).
          </p>

          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1.5">
              <span className="text-xs text-muted-foreground uppercase tracking-widest">Fournisseur</span>
              <select
                value={draft.provider}
                onChange={(e) => {
                  const next = providerById(e.target.value);
                  setDraft({ ...draft, provider: next.id, model: next.models[0]?.id ?? "" });
                }}
                className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors"
              >
                {AI_PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-xs text-muted-foreground uppercase tracking-widest">Modèle</span>
              <select
                value={draft.model}
                onChange={(e) => setDraft({ ...draft, model: e.target.value })}
                className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors"
              >
                {provider.models.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </label>
          </div>

          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={draft.apiKey}
              onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })}
              placeholder={provider.keyPlaceholder}
              className="w-full bg-background border border-border rounded px-3 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 transition-colors pr-10"
            />
            <button
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-border rounded text-muted-foreground hover:text-foreground transition-colors">
            Annuler
          </button>
          <button
            onClick={() => { onSave(draft); onClose(); }}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
