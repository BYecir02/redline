import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";

// L'explainer réel appelle Anthropic (clé + réseau) : on le mocke.
vi.mock("../engine/issueExplainer.js", () => ({
  explainIssue: vi.fn(async () => "**Analyse de test.** Utilise des requêtes paramétrées."),
}));

import { analyzeIssueController } from "./analyze.controller.js";
import { HttpError } from "../middlewares/errorHandler.js";

describe("analyzeIssueController", () => {
  it("renvoie { analysis } pour un corps valide avec clé API", async () => {
    const json = vi.fn();
    const req = {
      body: {
        apiKey: "sk-ant-test",
        skillName: "SQL Injection",
        category: "Sécurité",
        severity: "critical",
        filename: "db.js",
        line: 3,
        snippet: "db.query('SELECT ' + req.body.id)",
      },
    } as unknown as Request;
    const res = { json, status: vi.fn().mockReturnThis() } as unknown as Response;
    const next = vi.fn();

    await analyzeIssueController(req, res, next as unknown as NextFunction);

    expect(next).not.toHaveBeenCalled();
    const payload = json.mock.calls[0][0] as { analysis: string };
    expect(typeof payload.analysis).toBe("string");
    expect(payload.analysis.length).toBeGreaterThan(0);
  });

  it("passe une HttpError 400 à next si apiKey manque", async () => {
    const json = vi.fn();
    const req = { body: { skillName: "X", snippet: "y" } } as unknown as Request;
    const res = { json, status: vi.fn().mockReturnThis() } as unknown as Response;
    const next = vi.fn();

    await analyzeIssueController(req, res, next as unknown as NextFunction);

    expect(next).toHaveBeenCalledOnce();
    const err = next.mock.calls[0][0] as HttpError;
    expect(err).toBeInstanceOf(HttpError);
    expect(err.status).toBe(400);
  });
});
