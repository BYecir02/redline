// Interroge périodiquement les analytics persistées (Postgres) : synthèse +
// tendances. En pause, on cesse de rafraîchir (on garde le dernier état affiché).
// Remplace l'échantillonnage 72 s en mémoire : ces chiffres viennent de la base.
import { useEffect, useRef, useState } from "react";
import { getSummary, getTrends, type StatsSummary, type StatsTrends } from "../../../api/client";

export function useStats(
  paused: boolean,
  bucket: "minute" | "hour" | "day" = "minute",
  intervalMs = 4000,
  projectPath?: string,
): { summary: StatsSummary | null; trends: StatsTrends | null } {
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [trends, setTrends] = useState<StatsTrends | null>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      if (pausedRef.current) return;
      try {
        const [s, t] = await Promise.all([
          getSummary(projectPath),
          getTrends(bucket, 30, projectPath),
        ]);
        if (alive) {
          setSummary(s);
          setTrends(t);
        }
      } catch {
        /* backend indisponible : on conserve le dernier état connu */
      }
    };
    tick();
    const iv = setInterval(tick, intervalMs);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [bucket, intervalMs, projectPath]);

  return { summary, trends };
}
