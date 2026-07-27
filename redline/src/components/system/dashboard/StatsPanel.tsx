// Synthèse analytique persistée (Postgres) : compteurs, MTTR, récurrences,
// répartition par sévérité et top skills. Alimentée par GET /api/stats/summary.
import { Database, Clock, RotateCcw } from "lucide-react";
import type { StatsSummary } from "../../../api/client";
import type { Severity } from "../../../domain/types";
import { ALL_SKILLS } from "../../../domain/catalog";
import { SEV_DOT, SEV_LABEL } from "../../ui/severity";
import { CollapsibleSection } from "../../ui/CollapsibleSection";

const SEVERITIES: Severity[] = ["critical", "warning", "info"];

/** skillId → nom lisible (repli sur l'id si absent du catalogue). */
function skillName(id: string): string {
  return ALL_SKILLS.find((s) => s.id === id)?.name ?? id;
}

/** Formate une durée en secondes de façon compacte (s / m / h). */
function fmtDuration(sec: number | null): string {
  if (sec == null) return "—";
  if (sec < 1) return "<1s";
  if (sec < 60) return `${Math.round(sec)}s`;
  if (sec < 3600) return `${Math.round(sec / 60)}m`;
  return `${(sec / 3600).toFixed(1)}h`;
}

function Metric({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="flex flex-col">
      <span className={`text-xl font-medium ${accent ?? "text-foreground"}`}>{value}</span>
      <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{label}</span>
    </div>
  );
}

export function StatsPanel({ summary }: { summary: StatsSummary | null }) {
  const s = summary;
  const activeBySev = new Map(s?.bySeverity.map((r) => [r.severity, r.active]) ?? []);
  const maxSkill = Math.max(1, ...(s?.topSkills.map((k) => k.total) ?? [1]));

  return (
    <CollapsibleSection title="synthèse — historique persisté" icon={Database} storageKey="stats">
      <div className="space-y-4">
      {/* Compteurs clés */}
      <div className="grid grid-cols-4 gap-3">
        <Metric label="Actives" value={s?.totals.active ?? 0} accent="text-[#c0392b]" />
        <Metric label="Résolues" value={s?.totals.resolved ?? 0} accent="text-[#4a8a5a]" />
        <div className="flex flex-col">
          <span className="text-xl font-medium text-foreground flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" /> {fmtDuration(s?.mttrSeconds ?? null)}
          </span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest">MTTR moyen</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xl font-medium text-foreground flex items-center gap-1">
            <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" /> {s?.reopenedCount ?? 0}
          </span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Récurrences</span>
        </div>
      </div>

      {/* Répartition des actives par sévérité */}
      <div className="flex items-center gap-4">
        {SEVERITIES.map((sev) => (
          <span key={sev} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={`w-1.5 h-1.5 rounded-full ${SEV_DOT[sev]}`} />
            {SEV_LABEL[sev]} <span className="text-foreground font-medium">{activeBySev.get(sev) ?? 0}</span>
          </span>
        ))}
      </div>

      {/* Top skills */}
      {s && s.topSkills.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Skills les plus déclenchés</div>
          {s.topSkills.slice(0, 5).map((k) => (
            <div key={k.skillId} className="flex items-center gap-2">
              <span className="text-xs text-foreground w-40 truncate" title={skillName(k.skillId)}>
                {skillName(k.skillId)}
              </span>
              <div className="flex-1 h-1.5 bg-muted rounded overflow-hidden">
                <div className="h-full bg-primary/70 rounded" style={{ width: `${(k.total / maxSkill) * 100}%` }} />
              </div>
              <span className="text-xs text-muted-foreground w-10 text-right">
                {k.active}/{k.total}
              </span>
            </div>
          ))}
        </div>
      )}
      </div>
    </CollapsibleSection>
  );
}
