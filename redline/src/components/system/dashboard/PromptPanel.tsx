// Panneau latéral (3ᵉ colonne) du prompt de correction. Version non-bloquante du
// PromptModal : reste ouvert pendant que tu ajustes ta sélection, le prompt se
// reconstruit en direct. Repli sur PromptModal en dessous d'une certaine largeur.
import { Sparkles, X, Check } from "lucide-react";
import { PromptMarkdown } from "./PromptMarkdown";

export function PromptPanel({
  selectedCount, promptText, copied, onCopy, onClose,
}: {
  selectedCount: number;
  promptText: string;
  copied: boolean;
  onCopy: () => void;
  onClose: () => void;
}) {
  const empty = selectedCount === 0;

  return (
    <div className="h-full flex flex-col border border-border rounded bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="min-w-0">
          <h2 className="font-medium text-foreground flex items-center gap-2 text-sm">
            <Sparkles className="w-4 h-4 text-primary" /> Prompt de correction
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {empty
              ? "En attente d'une sélection"
              : `${selectedCount} problème${selectedCount > 1 ? "s" : ""} sélectionné${selectedCount > 1 ? "s" : ""}`}
          </p>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors shrink-0" title="Fermer le panneau">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3" style={{ scrollbarWidth: "thin" }}>
        {empty ? (
          <div className="h-full flex items-center justify-center text-center text-xs text-muted-foreground/60 px-4">
            Coche des alertes dans le flux : le prompt se construit ici, en direct.
          </div>
        ) : (
          <PromptMarkdown text={promptText} />
        )}
      </div>

      <div className="border-t border-border p-3">
        <button
          onClick={onCopy}
          disabled={empty}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2 text-sm rounded font-medium transition-all disabled:opacity-40 ${
            copied ? "bg-[#5a8a3a] text-white" : "bg-primary text-primary-foreground hover:opacity-90"
          }`}
        >
          {copied ? <><Check className="w-3.5 h-3.5" /> Copié !</> : "Copier le prompt"}
        </button>
      </div>
    </div>
  );
}
