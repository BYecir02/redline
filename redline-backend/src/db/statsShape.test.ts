import { describe, it, expect } from "vitest";
import { foldTrendRows, type TrendEventRow } from "./statsShape.js";

describe("foldTrendRows", () => {
  it("renvoie une série vide pour aucune ligne", () => {
    expect(foldTrendRows([])).toEqual([]);
  });

  it("fusionne les types d'un même bucket en un seul point", () => {
    const rows: TrendEventRow[] = [
      { at: "2026-07-15T01:00:00Z", type: "APPEARED", count: 3 },
      { at: "2026-07-15T01:00:00Z", type: "RESOLVED", count: 1 },
    ];
    expect(foldTrendRows(rows)).toEqual([
      { at: "2026-07-15T01:00:00Z", appeared: 3, resolved: 1, reopened: 0 },
    ]);
  });

  it("ordonne les buckets chronologiquement", () => {
    const rows: TrendEventRow[] = [
      { at: "2026-07-15T03:00:00Z", type: "APPEARED", count: 1 },
      { at: "2026-07-15T01:00:00Z", type: "APPEARED", count: 2 },
      { at: "2026-07-15T02:00:00Z", type: "REOPENED", count: 5 },
    ];
    expect(foldTrendRows(rows).map((p) => p.at)).toEqual([
      "2026-07-15T01:00:00Z",
      "2026-07-15T02:00:00Z",
      "2026-07-15T03:00:00Z",
    ]);
  });

  it("répartit chaque type dans la bonne colonne", () => {
    const rows: TrendEventRow[] = [
      { at: "t1", type: "APPEARED", count: 2 },
      { at: "t1", type: "RESOLVED", count: 4 },
      { at: "t1", type: "REOPENED", count: 6 },
    ];
    expect(foldTrendRows(rows)[0]).toEqual({ at: "t1", appeared: 2, resolved: 4, reopened: 6 });
  });
});
