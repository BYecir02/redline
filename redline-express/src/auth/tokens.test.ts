import { describe, it, expect } from "vitest";
import { signToken, verifyToken } from "./tokens.js";

describe("tokens", () => {
  it("signe puis vérifie un jeton (aller-retour du userId)", () => {
    const token = signToken("user-123");
    expect(typeof token).toBe("string");
    expect(verifyToken(token)).toEqual({ userId: "user-123" });
  });

  it("renvoie null pour un jeton altéré", () => {
    const token = signToken("user-123");
    expect(verifyToken(token + "tampered")).toBeNull();
  });

  it("renvoie null pour une chaîne qui n'est pas un JWT", () => {
    expect(verifyToken("pas-un-jwt")).toBeNull();
  });
});
