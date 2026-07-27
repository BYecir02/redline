// Graphe de tendance alimenté par l'HISTORIQUE PERSISTÉ (GET /api/stats/trends) :
// apparitions / résolutions / réouvertures agrégées par bucket temporel (SQL
// date_trunc côté Postgres). Remplace l'ancien échantillonnage 72 s en mémoire.
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";
import type { StatsTrends } from "../../../api/client";
import { CollapsibleSection } from "../../ui/CollapsibleSection";

const BUCKET_LABEL: Record<StatsTrends["bucket"], string> = {
  minute: "par minute",
  hour: "par heure",
  day: "par jour",
};

/** Étiquette d'axe selon le bucket : HH:MM (minute/heure) ou JJ/MM (jour). */
function fmtAt(iso: string, bucket: StatsTrends["bucket"]): string {
  const d = new Date(iso);
  if (bucket === "day") return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
  return d.toTimeString().slice(0, 5);
}

export function TrendChart({ trends }: { trends: StatsTrends | null }) {
  const bucket = trends?.bucket ?? "minute";
  const points = trends?.points ?? [];

  const legend = (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#c0392b] inline-block" /> Apparues</span>
      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#4a8a5a] inline-block" /> Résolues</span>
      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#c49a2a] inline-block" /> Rouvertes</span>
    </div>
  );

  return (
    <CollapsibleSection
      title={`tendance des détections — ${BUCKET_LABEL[bucket]}`}
      icon={TrendingUp}
      storageKey="trends"
      legend={legend}
    >
      {points.length === 0 ? (
        <div className="h-[90px] flex items-center justify-center text-xs text-muted-foreground/60">
          En attente de détections persistées…
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={90}>
          <AreaChart data={points} margin={{ top: 0, right: 0, bottom: 0, left: -28 }}>
            <defs>
              <linearGradient id="gAppeared" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#c0392b" stopOpacity={0.3} /><stop offset="95%" stopColor="#c0392b" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gResolved" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4a8a5a" stopOpacity={0.25} /><stop offset="95%" stopColor="#4a8a5a" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gReopened" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#c49a2a" stopOpacity={0.25} /><stop offset="95%" stopColor="#c49a2a" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="at" tickFormatter={(v) => fmtAt(String(v), bucket)}
              tick={{ fontSize: 10, fill: "#8a7a6a", fontFamily: "Outfit, sans-serif" }}
              tickLine={false} axisLine={false} minTickGap={24}
            />
            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#8a7a6a", fontFamily: "Outfit, sans-serif" }} tickLine={false} axisLine={false} />
            <Tooltip
              labelFormatter={(v) => fmtAt(String(v), bucket)}
              contentStyle={{ background: "#ede7da", border: "1px solid rgba(42,31,20,0.15)", borderRadius: 4, fontFamily: "Outfit, sans-serif", fontSize: 12, color: "#2a1f14" }}
              cursor={{ stroke: "rgba(192,57,43,0.15)" }}
            />
            <Area type="monotone" dataKey="reopened" name="Rouvertes" stroke="#c49a2a" strokeWidth={1} fill="url(#gReopened)" dot={false} isAnimationActive={false} />
            <Area type="monotone" dataKey="resolved" name="Résolues" stroke="#4a8a5a" strokeWidth={1} fill="url(#gResolved)" dot={false} isAnimationActive={false} />
            <Area type="monotone" dataKey="appeared" name="Apparues" stroke="#c0392b" strokeWidth={1.5} fill="url(#gAppeared)" dot={false} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </CollapsibleSection>
  );
}
