// Onglet d'étape du wizard de setup (numéro / coché / actif / désactivé).
import { Check } from "lucide-react";

export function StepTab({ n, label, active, done, disabled, onClick }: {
  n: number; label: string; active: boolean; done: boolean; disabled: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2.5 text-sm flex items-center gap-2 transition-colors border-r border-border last:border-r-0 ${
        active ? "bg-primary text-primary-foreground"
        : disabled ? "text-muted-foreground/40 cursor-not-allowed"
        : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
      }`}
    >
      {done && !active ? <Check className="w-3.5 h-3.5" /> : <span className="text-xs opacity-60">0{n}</span>}
      {label}
    </button>
  );
}
