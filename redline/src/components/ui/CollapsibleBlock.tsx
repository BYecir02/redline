// Bloc pliable façon VSCode : ouvert, il grandit pour se partager la hauteur
// disponible avec les autres blocs ouverts (scroll interne) ; fermé, il se réduit
// à son en-tête. Plus de hauteur fixe — c'est le conteneur flex qui répartit.
import { useState, type ElementType, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";

export function CollapsibleBlock({ title, icon: Icon, children, defaultOpen = true, action }: {
  title: string;
  icon: ElementType;
  children: ReactNode;
  defaultOpen?: boolean;
  action?: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`border border-border rounded bg-card overflow-hidden flex flex-col ${open ? "flex-1 min-h-0" : "shrink-0"}`}>
      <div className="flex items-center px-3 py-2.5 hover:bg-muted/30 transition-colors shrink-0">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex-1 flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-widest text-left"
        >
          <Icon className="w-3.5 h-3.5" />
          {title}
        </button>
        <div className="flex items-center gap-2">
          {action}
          <button onClick={() => setOpen((v) => !v)}>
            <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground/40 transition-transform ${open ? "rotate-90" : ""}`} />
          </button>
        </div>
      </div>
      {open && (
        <div
          className="flex-1 min-h-0 overflow-y-auto border-t border-border/50"
          style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(42,31,20,0.1) transparent" }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
