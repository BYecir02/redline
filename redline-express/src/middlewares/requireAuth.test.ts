import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { requireAuth } from "./requireAuth.js";
import { signToken } from "../auth/tokens.js";
import { HttpError } from "./errorHandler.js";

function run(authorization?: string) {
  const req = { headers: authorization ? { authorization } : {} } as unknown as Request;
  const res = {} as Response;
  const next = vi.fn();
  requireAuth(req, res, next as unknown as NextFunction);
  return { req, next };
}

describe("requireAuth", () => {
  it("attache req.userId pour un Bearer valide", () => {
    const token = signToken("user-42");
    const { req, next } = run(`Bearer ${token}`);
    expect(req.userId).toBe("user-42");
    expect(next).toHaveBeenCalledWith(); // next() sans erreur
  });

  it("401 si l'en-tête Authorization manque", () => {
    const { next } = run();
    const err = next.mock.calls[0][0] as HttpError;
    expect(err).toBeInstanceOf(HttpError);
    expect(err.status).toBe(401);
  });

  it("401 si le schéma n'est pas Bearer", () => {
    const { next } = run("Basic abc");
    expect((next.mock.calls[0][0] as HttpError).status).toBe(401);
  });

  it("401 pour un jeton invalide", () => {
    const { next } = run("Bearer not-a-real-token");
    expect((next.mock.calls[0][0] as HttpError).status).toBe(401);
  });
});
