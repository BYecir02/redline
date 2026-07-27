// Étape 5 — activation des skills (filtrés selon la stack) + lancement.
import { Search, Zap } from "lucide-react";
import type { Skill } from "../../../../domain/types";
import { SEV_DOT } from "../../../ui/severity";
import { SeverityBadge } from "../../../ui/SeverityBadge";
import { Toggle } from "../../../ui/Toggle";

export function StepSkills({
  allStack, enabledCount, search, onSearchChange, categories,
  filteredSkills, onToggleSkill, canLaunch, onLaunch, onBack,
}: {
  allStack: string[];
  enabledCount: number;
  search: string;
  onSearchChange: (v: string) => void;
  categories: string[];
  filteredSkills: (cat: string) => Skill[];
  onToggleSkill: (id: string) => void;
  canLaunch: boolean;
  onLaunch: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-4">
      {allStack.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 border border-border rounded px-3 py-2">
          <Zap className="w-3.5 h-3.5 text-primary shrink-0" />
          <span>Skills filtrés pour : <span className="text-foreground">{allStack.join(", ")}</span></span>
        </div>
      )}
      <div className="flex items-center justify-between gap-4">
        <div className="text-xs text-muted-foreground uppercase tracking-widest">
          {enabledCount} skill{enabledCount !== 1 ? "s" : ""} activé{enabledCount !== 1 ? "s" : ""}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
          <input
            type="text" value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher un skill..."
            className="w-full bg-card border border-border rounded pl-8 pr-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
          />
          {search && (
            <button onClick={() => onSearchChange("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground text-xs">✕</button>
          )}
        </div>
      </div>

      {categories.map((cat) => {
        const visible = filteredSkills(cat);
        if (visible.length === 0) return null;
        return (
          <div key={cat} className="border border-border rounded bg-card overflow-hidden">
            <div className="px-4 py-2 border-b border-border/50 text-xs text-muted-foreground uppercase tracking-widest bg-muted/40">{cat}</div>
            <div className="divide-y divide-border/40">
              {visible.map((skill) => (
                <div
                  key={skill.id}
                  className="px-4 py-3 flex items-start justify-between gap-3 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => onToggleSkill(skill.id)}
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${SEV_DOT[skill.severity]} ${skill.enabled ? "opacity-100" : "opacity-20"}`} />
                    <div className="min-w-0">
                      <div className={`text-sm ${skill.enabled ? "text-foreground" : "text-muted-foreground"}`}>{skill.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{skill.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <SeverityBadge severity={skill.severity} />
                    <Toggle enabled={skill.enabled} onToggle={() => onToggleSkill(skill.id)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div className="flex items-center justify-between pt-2">
        <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Retour</button>
        <button
          onClick={() => canLaunch && onLaunch()}
          disabled={!canLaunch}
          className="flex items-center gap-2 px-5 py-2.5 text-sm bg-primary text-primary-foreground rounded disabled:opacity-40 hover:opacity-90 transition-opacity font-medium"
        >
          <Zap className="w-4 h-4" /> Lancer Redline
        </button>
      </div>
    </div>
  );
}
