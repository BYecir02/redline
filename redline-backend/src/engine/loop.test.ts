import { describe, it, expect, vi, beforeEach } from "vitest";

// On mocke aiClient pour ne jamais appeler la vraie API IA dans les tests.
// analyzeCode reste réel (ESLint + skill sql-injection) : c'est lui qui décide
// de la convergence, donc on veut son vrai comportement.
vi.mock("./aiClient.js", () => ({
  requestFix: vi.fn(),
}));

import { requestFix } from "./aiClient.js";
import { runCorrectionLoop } from "./loop.js";

const mockedRequestFix = vi.mocked(requestFix);

const VULNERABLE = `db.query("SELECT * FROM users WHERE id = " + req.body.id);`;
const SAFE = `db.query("SELECT * FROM users WHERE id = ?", [req.body.id]);`;

describe("runCorrectionLoop", () => {
  beforeEach(() => {
    mockedRequestFix.mockReset();
  });

  it("converge en une passe quand l'IA corrige tout", async () => {
    mockedRequestFix.mockResolvedValue(SAFE);

    const result = await runCorrectionLoop(VULNERABLE, "db.js", ["sql-injection"], 3);

    expect(result.converged).toBe(true);
    expect(result.attempts).toBe(1);
    expect(result.report.issues).toHaveLength(0);
    expect(result.code).toBe(SAFE);
    expect(mockedRequestFix).toHaveBeenCalledTimes(1);
  });

  it("s'arrête à maxAttempts sans converger si l'IA ne corrige pas", async () => {
    // L'IA renvoie du code toujours vulnérable → jamais de convergence.
    mockedRequestFix.mockResolvedValue(VULNERABLE);

    const result = await runCorrectionLoop(VULNERABLE, "db.js", ["sql-injection"], 3);

    expect(result.converged).toBe(false);
    expect(result.attempts).toBe(3);
    expect(result.report.issues.length).toBeGreaterThan(0);
    expect(mockedRequestFix).toHaveBeenCalledTimes(3);
  });

  it("ne convoque pas l'IA si le code est déjà propre", async () => {
    const result = await runCorrectionLoop(SAFE, "db.js", ["sql-injection"], 3);

    expect(result.converged).toBe(true);
    expect(result.attempts).toBe(0);
    expect(mockedRequestFix).not.toHaveBeenCalled();
  });
});
