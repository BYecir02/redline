// Une ligne d'alerte (compacte) + son détail dépliable (extrait, analyse, actions).
import ReactMarkdown from "react-markdown";
import { Check, Sparkles, ChevronRight, Clock, Loader2, EyeOff } from "lucide-react";
import type { Alert, Skill } from "../../../domain/types";
import { SeverityBadge } from "../../ui/SeverityBadge";
import { SEV_ICON, SEV_COLOR } from "../../ui/severity";
import { formatRelative } from "../../../domain/utils";

export function AlertRow({
  alert, skill, isExpanded, isSelected, apiKey,
  onToggleExpand, onToggleSelect, onAnalyze, onIgnore,
}: {
  alert: Alert;
  skill: Skill;
  isExpanded: boolean;
  isSelected: boolean;
  apiKey: string;
  onToggleExpand: () => void;
  onToggleSelect: () => void;
  onAnalyze: () => void;
  onIgnore: () => void;
}) {
  const Icon = SEV_ICON[skill.severity];
  const isResolved = !!alert.resolved;

  return (
    <div className={`border-b border-border/40 transition-all ${isSelected ? "border-l-2 border-l-primary bg-primary/5" : ""} ${isResolved ? "opacity-60" : ""}`}>
      {/* Compact row */}
      <div
        className={`px-4 py-2.5 flex items-center gap-3 cursor-pointer transition-colors ${isExpanded ? "bg-muted/30" : "hover:bg-muted/20"}`}
        onClick={onToggleExpand}
      >
        {!isResolved && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => { e.stopPropagation(); onToggleSelect(); }}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 accent-primary cursor-pointer"
          />
        )}
        {isResolved
          ? <Check className="w-3.5 h-3.5 shrink-0 text-[#5a8a3a]" />
          : <Icon className={`w-3.5 h-3.5 shrink-0 ${SEV_COLOR[skill.severity]}`} />
        }
        <span className={`text-sm font-medium shrink-0 ${isResolved ? "text-muted-foreground line-through" : SEV_COLOR[skill.severity]}`}>{skill.name}</span>
        <span className="text-muted-foreground/40 shrink-0">·</span>
        <span className="text-xs font-mono text-muted-foreground truncate flex-1">{alert.folderPath}/{alert.file}</span>
        {isResolved && alert.resolvedAt
          ? <span className="text-xs text-[#5a8a3a] shrink-0">résolu {formatRelative(alert.resolvedAt)}</span>
          : <span className="text-xs text-muted-foreground shrink-0">{formatRelative(alert.timestamp)}</span>
        }
        {alert.analysis && !isResolved && <Sparkles className="w-3 h-3 text-primary shrink-0" />}
        <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground/40 shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-3.5 pt-1 space-y-2 border-t border-border/30">
          <div className="bg-background border border-border/50 rounded px-3 py-2 text-xs text-muted-foreground font-mono leading-relaxed">
            {alert.snippet}
          </div>

          {alert.analysis && (
            <div className="bg-primary/5 border border-primary/20 rounded px-3 py-2.5">
              <div className="flex items-center gap-1.5 mb-1.5 text-xs text-primary font-medium">
                <Sparkles className="w-3 h-3" /> Analyse IA
              </div>
              <div className="text-xs text-foreground/80 leading-relaxed">
                <ReactMarkdown components={{
                  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                  code: ({ children }) => <code className="font-mono bg-background/60 px-1 py-0.5 rounded text-[11px] text-foreground">{children}</code>,
                  p: ({ children }) => <p className="mb-0">{children}</p>,
                }}>
                  {alert.analysis}
                </ReactMarkdown>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <SeverityBadge severity={skill.severity} />
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatRelative(alert.timestamp)}</span>
            <div className="ml-auto flex items-center gap-2">
              {!isResolved && !alert.analysis && (
                <button
                  onClick={onAnalyze}
                  disabled={alert.analyzing}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs border border-border rounded hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-50"
                >
                  {alert.analyzing
                    ? <><Loader2 className="w-3 h-3 animate-spin" /> Analyse...</>
                    : <><Sparkles className="w-3 h-3" /> {apiKey ? "Analyser" : "Analyser (démo)"}</>
                  }
                </button>
              )}
              {!isResolved ? (
                <button
                  onClick={(e) => { e.stopPropagation(); onIgnore(); }}
                  title="Faux positif : ne plus afficher cette alerte"
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs border border-border text-muted-foreground rounded hover:text-foreground hover:border-muted-foreground/40 transition-colors"
                >
                  <EyeOff className="w-3 h-3" /> Ignorer
                </button>
              ) : (
                <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-[#5a8a3a]">
                  <Check className="w-3 h-3" /> Résolu par la détection
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
