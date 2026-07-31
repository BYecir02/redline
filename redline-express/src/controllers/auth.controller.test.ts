import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";

// Prisma mocké : pas de vraie DB dans les tests unitaires.
const findUnique = vi.fn();
const create = vi.fn();
vi.mock("../db/client.js", () => ({
  prisma: { user: { findUnique: (...a: unknown[]) => findUnique(...a), create: (...a: unknown[]) => create(...a) } },
}));

// bcrypt mocké : rapide et déterministe.
vi.mock("../auth/passwords.js", () => ({
  hashPassword: vi.fn(async (p: string) => `hashed:${p}`),
  verifyPassword: vi.fn(async (p: string, h: string) => h === `hashed:${p}`),
}));

import { signupController, loginController } from "./auth.controller.js";
import { HttpError } from "../middlewares/errorHandler.js";

function mockRes() {
  const res = {} as Response & { body?: unknown; code?: number };
  res.status = vi.fn().mockImplementation((c: number) => {
    res.code = c;
    return res;
  }) as unknown as Response["status"];
  res.json = vi.fn().mockImplementation((b: unknown) => {
    res.body = b;
    return res;
  }) as unknown as Response["json"];
  return res;
}

beforeEach(() => {
  findUnique.mockReset();
  create.mockReset();
});

describe("signupController", () => {
  it("crée un compte et renvoie { token, user } sans passwordHash", async () => {
    findUnique.mockResolvedValue(null);
    create.mockResolvedValue({
      id: "u1",
      email: "a@b.com",
      passwordHash: "hashed:motdepasse1",
      createdAt: new Date(),
    });
    const res = mockRes();
    const next = vi.fn();

    await signupController(
      { body: { email: "A@B.com", password: "motdepasse1" } } as Request,
      res,
      next as unknown as NextFunction,
    );

    expect(next).not.toHaveBeenCalled();
    expect(res.code).toBe(201);
    const body = res.body as { token: string; user: Record<string, unknown> };
    expect(typeof body.token).toBe("string");
    expect(body.user).toEqual({ id: "u1", email: "a@b.com", createdAt: expect.any(Date) });
    expect(body.user).not.toHaveProperty("passwordHash");
    // E-mail normalisé en minuscules avant persistance.
    expect(create.mock.calls[0][0].data.email).toBe("a@b.com");
  });

  it("409 si l'e-mail existe déjà", async () => {
    findUnique.mockResolvedValue({ id: "u1", email: "a@b.com" });
    const next = vi.fn();
    await signupController(
      { body: { email: "a@b.com", password: "motdepasse1" } } as Request,
      mockRes(),
      next as unknown as NextFunction,
    );
    expect((next.mock.calls[0][0] as HttpError).status).toBe(409);
  });

  it("400 si le mot de passe est trop court", async () => {
    const next = vi.fn();
    await signupController(
      { body: { email: "a@b.com", password: "court" } } as Request,
      mockRes(),
      next as unknown as NextFunction,
    );
    expect((next.mock.calls[0][0] as HttpError).status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("400 si l'e-mail est invalide", async () => {
    const next = vi.fn();
    await signupController(
      { body: { email: "pas-un-email", password: "motdepasse1" } } as Request,
      mockRes(),
      next as unknown as NextFunction,
    );
    expect((next.mock.calls[0][0] as HttpError).status).toBe(400);
  });
});

describe("loginController", () => {
  it("renvoie { token, user } pour de bons identifiants", async () => {
    findUnique.mockResolvedValue({
      id: "u1",
      email: "a@b.com",
      passwordHash: "hashed:motdepasse1",
      createdAt: new Date(),
    });
    const res = mockRes();
    const next = vi.fn();
    await loginController(
      { body: { email: "a@b.com", password: "motdepasse1" } } as Request,
      res,
      next as unknown as NextFunction,
    );
    expect(next).not.toHaveBeenCalled();
    expect((res.body as { token: string }).token).toBeTypeOf("string");
  });

  it("401 pour un e-mail inconnu", async () => {
    findUnique.mockResolvedValue(null);
    const next = vi.fn();
    await loginController(
      { body: { email: "x@y.com", password: "motdepasse1" } } as Request,
      mockRes(),
      next as unknown as NextFunction,
    );
    expect((next.mock.calls[0][0] as HttpError).status).toBe(401);
  });

  it("401 pour un mauvais mot de passe", async () => {
    findUnique.mockResolvedValue({
      id: "u1",
      email: "a@b.com",
      passwordHash: "hashed:motdepasse1",
      createdAt: new Date(),
    });
    const next = vi.fn();
    await loginController(
      { body: { email: "a@b.com", password: "mauvais-mot-de-passe" } } as Request,
      mockRes(),
      next as unknown as NextFunction,
    );
    expect((next.mock.calls[0][0] as HttpError).status).toBe(401);
  });
});
