// Panneau d'alertes : onglets Actives/Résolues, filtres, actions groupées, liste.
import { Check, Sparkles, Terminal } from "lucide-react";
import type { Alert, Skill, Severity } from "../../../domain/types";
import { SEV_BG, SEV_COLOR } from "../../ui/severity";
import { AlertRow } from "./AlertRow";

export function AlertsPanel({
  alertTab, onAlertTabChange, activeAlerts, resolvedCount, criticalCount,
  filterSeverity, onFilterSeverityChange, skills,
  selectedSkillName, onClearSelectedSkill,
  selectedCount, onOpenPrompt, onClearSelection,
  visibleAlerts, expandedAlerts, selectedAlerts, apiKey, tick,
  ignoredCount, onRestoreIgnored,
  onToggleExpand, onToggleSelect, onAnalyze, onIgnore,
}: {
  alertTab: "active" | "resolved";
  onAlertTabChange: (tab: "active" | "resolved") => void;
  activeAlerts: Alert[];
  resolvedCount: number;
  criticalCount: number;
  filterSeverity: Severity | "all";
  onFilterSeverityChange: (s: Severity | "all") => void;
  skills: Skill[];
  selectedSkillName: string | null;
  onClearSelectedSkill: () => void;
  selectedCount: number;
  onOpenPrompt: () => void;
  onClearSelection: () => void;
  visibleAlerts: Alert[];
  expandedAlerts: Set<string>;
  selectedAlerts: Set<string>;
  apiKey: string;
  tick: number;
  ignoredCount: number;
  onRestoreIgnored: () => void;
  onToggleExpand: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onAnalyze: (id: string) => void;
  onIgnore: (id: string) => void;
}) {
  const severityCount = (sev: Severity) =>
    activeAlerts.filter((a) => skills.find((s) => s.id === a.skillId)?.severity === sev).length;

  return (
    <>
      {/* Onglets Actives / Résolues */}
      <div className="flex items-center gap-1 border border-border rounded overflow-hidden w-fit">
        <button
          onClick={() => onAlertTabChange("active")}
          className={`px-3 py-1.5 text-xs transition-colors flex items-center gap-1.5 ${alertTab === "active" ? "bg-foreground/8 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          Actives
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium tabular-nums ${criticalCount > 0 ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
            {activeAlerts.length}
          </span>
        </button>
        <div className="w-px h-4 bg-border" />
        <button
          onClick={() => onAlertTabChange("resolved")}
          className={`px-3 py-1.5 text-xs transition-colors flex items-center gap-1.5 ${alertTab === "resolved" ? "bg-foreground/8 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          Résolues
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium tabular-nums bg-muted text-muted-foreground">
            {resolvedCount}
          </span>
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground uppercase tracking-widest mr-1">filtre</span>
        {([
          { key: "all", label: "Tous" },
          { key: "critical", label: "Critique" },
          { key: "warning", label: "Attention" },
          { key: "info", label: "Info" },
        ] as const).map(({ key, label }) => (
          <button key={key} onClick={() => onFilterSeverityChange(key)}
            className={`px-3 py-1 text-xs rounded border transition-colors ${
              filterSeverity === key
                ? key === "all" ? "border-foreground/30 text-foreground bg-secondary"
                  : `${SEV_BG[key as Severity]} ${SEV_COLOR[key as Severity]}`
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
            {key !== "all" && <span className="ml-1.5 opacity-60">{severityCount(key as Severity)}</span>}
          </button>
        ))}
        {selectedSkillName && (
          <button onClick={onClearSelectedSkill} className="ml-2 px-3 py-1 text-xs border border-primary/30 text-primary rounded hover:bg-primary/10 transition-colors">
            ✕ {selectedSkillName}
          </button>
        )}
        <div className="ml-auto flex items-center gap-3">
          {ignoredCount > 0 && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {ignoredCount} ignorée{ignoredCount > 1 ? "s" : ""}
              <button onClick={onRestoreIgnored} className="ml-1.5 text-primary hover:underline">réafficher</button>
            </span>
          )}
          <span className="text-xs text-muted-foreground tabular-nums"><span key={tick}>{visibleAlerts.length}</span> {alertTab === "active" ? "actives" : "résolues"}</span>
          {selectedCount > 0 && alertTab === "active" && (
            <button
              onClick={onOpenPrompt}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity font-medium"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Générer le prompt ({selectedCount})
            </button>
          )}
          {selectedCount > 0 && (
            <button onClick={onClearSelection} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Désélectionner
            </button>
          )}
        </div>
      </div>

      <div className="border border-border rounded bg-card flex-1 flex flex-col min-h-0">
        <div className="overflow-y-auto flex-1" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(42,31,20,0.1) transparent" }}>
          {visibleAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
              {alertTab === "resolved"
                ? <><Check className="w-6 h-6 opacity-20" /><span className="text-sm">aucune alerte résolue</span></>
                : <><Terminal className="w-6 h-6 opacity-20" /><span className="text-sm">surveillance en cours...</span></>
              }
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {visibleAlerts.map((alert) => {
                const skill = skills.find((s) => s.id === alert.skillId);
                if (!skill) return null;
                return (
                  <AlertRow
                    key={alert.id}
                    alert={alert}
                    skill={skill}
                    isExpanded={expandedAlerts.has(alert.id)}
                    isSelected={selectedAlerts.has(alert.id)}
                    apiKey={apiKey}
                    onToggleExpand={() => onToggleExpand(alert.id)}
                    onToggleSelect={() => onToggleSelect(alert.id)}
                    onAnalyze={() => onAnalyze(alert.id)}
                    onIgnore={() => onIgnore(alert.id)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
