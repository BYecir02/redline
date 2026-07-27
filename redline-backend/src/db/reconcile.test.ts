import { describe, it, expect } from "vitest";
import { planReconciliation, signatureOf, type ExistingDetection } from "./reconcile.js";

describe("signatureOf", () => {
  it("compose fichier::skill::extrait et trim l'extrait", () => {
    expect(signatureOf("api.js", "sql-injection", "  db.query(x)  ")).toBe(
      "api.js::sql-injection::db.query(x)",
    );
  });
});

describe("planReconciliation", () => {
  it("crée les problèmes inconnus", () => {
    const plan = planReconciliation([], ["s1", "s2"]);
    expect(plan.create.sort()).toEqual(["s1", "s2"]);
    expect(plan).toMatchObject({ reopen: [], touch: [], resolve: [] });
  });

  it("touche (rafraîchit) un problème déjà ACTIVE toujours présent", () => {
    const existing: ExistingDetection[] = [{ id: "d1", signature: "s1", status: "ACTIVE" }];
    const plan = planReconciliation(existing, ["s1"]);
    expect(plan.touch).toEqual(["d1"]);
    expect(plan.create).toEqual([]);
    expect(plan.resolve).toEqual([]);
  });

  it("résout un problème ACTIVE désormais absent", () => {
    const existing: ExistingDetection[] = [{ id: "d1", signature: "s1", status: "ACTIVE" }];
    const plan = planReconciliation(existing, []);
    expect(plan.resolve).toEqual(["d1"]);
    expect(plan.touch).toEqual([]);
  });

  it("rouvre un problème RESOLVED qui réapparaît", () => {
    const existing: ExistingDetection[] = [{ id: "d1", signature: "s1", status: "RESOLVED" }];
    const plan = planReconciliation(existing, ["s1"]);
    expect(plan.reopen).toEqual(["d1"]);
    expect(plan.create).toEqual([]);
    expect(plan.resolve).toEqual([]);
  });

  it("laisse un RESOLVED tranquille s'il reste absent", () => {
    const existing: ExistingDetection[] = [{ id: "d1", signature: "s1", status: "RESOLVED" }];
    const plan = planReconciliation(existing, []);
    expect(plan).toMatchObject({ create: [], reopen: [], touch: [], resolve: [] });
  });

  it("gère un mélange create + touch + reopen + resolve en une passe", () => {
    const existing: ExistingDetection[] = [
      { id: "d-active", signature: "still-here", status: "ACTIVE" },
      { id: "d-gone", signature: "gone", status: "ACTIVE" },
      { id: "d-back", signature: "back", status: "RESOLVED" },
    ];
    const plan = planReconciliation(existing, ["still-here", "back", "brand-new"]);
    expect(plan.touch).toEqual(["d-active"]);
    expect(plan.resolve).toEqual(["d-gone"]);
    expect(plan.reopen).toEqual(["d-back"]);
    expect(plan.create).toEqual(["brand-new"]);
  });

  it("dédoublonne les signatures entrantes identiques", () => {
    const plan = planReconciliation([], ["dup", "dup"]);
    expect(plan.create).toEqual(["dup"]);
  });
});
