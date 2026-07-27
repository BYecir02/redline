// Modal du prompt de correction généré à partir des alertes sélectionnées.
import { Sparkles, X, Check } from "lucide-react";
import { PromptMarkdown } from "./PromptMarkdown";

export function PromptModal({
  selectedCount, promptText, copied, onCopy, onClose,
}: {
  selectedCount: number;
  promptText: string;
  copied: boolean;
  onCopy: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="font-medium text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Prompt de correction
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">{selectedCount} problème{selectedCount > 1 ? "s" : ""} sélectionné{selectedCount > 1 ? "s" : ""} - copie ce prompt et envoie-le à ton IA</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4" style={{ scrollbarWidth: "thin" }}>
          <PromptMarkdown text={promptText} />
        </div>

        <div className="border-t border-border p-4 flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">Prompt prêt à être copié dans votre assistant IA</span>
          <button
            onClick={onCopy}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded font-medium transition-all ${
              copied ? "bg-[#5a8a3a] text-white" : "bg-primary text-primary-foreground hover:opacity-90"
            }`}
          >
            {copied ? <><Check className="w-3.5 h-3.5" /> Copié !</> : "Copier le prompt"}
          </button>
        </div>
      </div>
    </div>
  );
}
