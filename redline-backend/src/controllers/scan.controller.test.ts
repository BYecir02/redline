import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import {
  generateFixPromptController,
  listSkillsController,
} from "./scan.controller.js";

// On teste le controller directement (analyzeCode + buildCorrectionPrompt réels,
// pas d'appel réseau) via des faux req/res/next.
function makeCtx(body: unknown) {
  const json = vi.fn();
  const req = { body } as unknown as Request;
  const res = { json, status: vi.fn().mockReturnThis() } as unknown as Response;
  const next = vi.fn() as unknown as NextFunction;
  return { req, res, next, json };
}

const VULNERABLE = `db.query("SELECT * FROM users WHERE id = " + req.body.id);`;
const SAFE = `db.query("SELECT * FROM users WHERE id = ?", [req.body.id]);`;

describe("listSkillsController", () => {
  it("retourne les 3 skills du registre sans le champ rule", () => {
    const json = vi.fn();
    const res = {
      json,
      status: vi.fn().mockReturnThis(),
    } as unknown as Response;

    listSkillsController({} as Request, res);

    const payload = json.mock.calls[0][0] as Array<Record<string, unknown>>;
    const ids = payload.map((s) => s.id);

    expect(ids).toContain("sql-injection");
    expect(ids).toContain("missing-error-handling");
    expect(ids).toContain("hardcoded-secret");

    for (const skill of payload) {
      expect(skill).not.toHaveProperty("rule");
      // Contrat SkillMeta complet consommé par le catalogue de l'UI.
      expect(skill).toHaveProperty("id");
      expect(skill).toHaveProperty("name");
      expect(skill).toHaveProperty("description");
      expect(skill).toHaveProperty("category");
      expect(skill).toHaveProperty("severity");
      expect(skill).toHaveProperty("pattern");
      expect(skill).toHaveProperty("targets");
      expect(["critical", "warning", "info"]).toContain(skill.severity);
      expect(["security", "quality", "reliability"]).toContain(skill.category);
    }
  });
});

describe("generateFixPromptController", () => {
  it("retourne un prompt non vide contenant le nom du fichier et les messages des issues", async () => {
    const { req, res, next, json } = makeCtx({
      code: VULNERABLE,
      filename: "db.js",
      skills: ["sql-injection"],
    });

    await generateFixPromptController(req, res, next);

    expect(next).not.toHaveBeenCalled();
    const payload = json.mock.calls[0][0];

    expect(typeof payload.prompt).toBe("string");
    expect(payload.prompt).toContain("db.js");
    expect(payload.report.issues.length).toBeGreaterThan(0);
    for (const issue of payload.report.issues) {
      expect(payload.prompt).toContain(issue.message);
    }
  });

  it("retourne prompt null quand il n'y a aucune issue", async () => {
    const { req, res, next, json } = makeCtx({
      code: SAFE,
      filename: "db.js",
      skills: ["sql-injection"],
    });

    await generateFixPromptController(req, res, next);

    expect(next).not.toHaveBeenCalled();
    const payload = json.mock.calls[0][0];

    expect(payload.prompt).toBeNull();
    expect(payload.report.issues).toHaveLength(0);
  });
});
