// Section repliable à hauteur NATURELLE (pour la zone principale du dashboard) :
// l'en-tête sert de bouton (chevron), le corps se plie/déplie. L'état ouvert est
// mémorisé en localStorage par `storageKey` → il survit au refresh.
// (À ne pas confondre avec CollapsibleBlock, qui remplit la hauteur dispo façon VSCode.)
import { useState, type ElementType, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";

function usePersistedOpen(storageKey: string, defaultOpen: boolean): [boolean, () => void] {
  const [open, setOpen] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(`redline.collapse.${storageKey}`);
      return raw == null ? defaultOpen : raw === "1";
    } catch {
      return defaultOpen;
    }
  });
  const toggle = () => {
    setOpen((v) => {
      const next = !v;
      try {
        localStorage.setItem(`redline.collapse.${storageKey}`, next ? "1" : "0");
      } catch {
        /* stockage indisponible : l'état ne survivra pas au refresh */
      }
      return next;
    });
  };
  return [open, toggle];
}

export function CollapsibleSection({
  title,
  icon: Icon,
  storageKey,
  legend,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: ElementType;
  storageKey: string;
  /** Contenu à droite de l'en-tête (légende, compteurs…), masqué quand replié. */
  legend?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, toggle] = usePersistedOpen(storageKey, defaultOpen);

  return (
    <div className="border border-border rounded bg-card">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <button
          onClick={toggle}
          className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-widest hover:text-foreground transition-colors"
        >
          <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground/50 transition-transform ${open ? "rotate-90" : ""}`} />
          <Icon className="w-3.5 h-3.5" />
          {title}
        </button>
        {open && legend}
      </div>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
