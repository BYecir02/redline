/**
 * Reshaping PUR des lignes d'agrégation SQL en séries prêtes pour le front.
 * Isolé ici (sans DB) pour être testé unitairement ; `statsRepo.ts` fournit les
 * lignes brutes issues des requêtes Postgres.
 */

export type TrendEventType = "APPEARED" | "RESOLVED" | "REOPENED";

/** Une ligne brute : un bucket temporel × un type d'événement × un compte. */
export type TrendEventRow = { at: string; type: TrendEventType; count: number };

/** Un point de tendance : un bucket avec les comptes par type d'événement. */
export type TrendPoint = {
  at: string;
  appeared: number;
  resolved: number;
  reopened: number;
};

/**
 * Regroupe les lignes (bucket × type) en points ordonnés chronologiquement.
 * Plusieurs types tombent sur le même bucket → fusionnés en un seul point.
 */
export function foldTrendRows(rows: TrendEventRow[]): TrendPoint[] {
  const byBucket = new Map<string, TrendPoint>();

  for (const row of rows) {
    let point = byBucket.get(row.at);
    if (!point) {
      point = { at: row.at, appeared: 0, resolved: 0, reopened: 0 };
      byBucket.set(row.at, point);
    }
    if (row.type === "APPEARED") point.appeared += row.count;
    else if (row.type === "RESOLVED") point.resolved += row.count;
    else if (row.type === "REOPENED") point.reopened += row.count;
  }

  return [...byBucket.values()].sort((a, b) =>
    a.at < b.at ? -1 : a.at > b.at ? 1 : 0,
  );
}
