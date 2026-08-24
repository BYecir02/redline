import { beforeEach, describe, expect, it, vi } from "vitest";

const anthropicMock = vi.hoisted(() => ({
  create: vi.fn(),
  apiKeys: [] as string[],
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: class AnthropicMock {
    messages = { create: anthropicMock.create };

    constructor(options: { apiKey: string }) {
      anthropicMock.apiKeys.push(options.apiKey);
    }
  },
}));

import { explainIssue, type IssueContext } from "./issueExplainer.js";

const context: IssueContext = {
  skillName: "SQL Injection",
  category: "Sécurité",
  severity: "critical",
  filename: "src/db.ts",
  line: 12,
  snippet: 'db.query("SELECT " + id)',
};

describe("explainIssue - contrat Anthropic", () => {
  beforeEach(() => {
    anthropicMock.create.mockReset();
    anthropicMock.apiKeys.length = 0;
  });

  it("envoie le contrat attendu et concatène uniquement les blocs texte", async () => {
    anthropicMock.create.mockResolvedValue({
      content: [
        { type: "text", text: "  Première partie. " },
        { type: "tool_use", name: "ignored" },
        { type: "text", text: "Deuxième partie.  " },
      ],
    });

    const result = await explainIssue(context, {
      provider: "anthropic",
      model: "claude-sonnet-test",
      apiKey: "test-key-never-sent",
    });

    expect(result).toBe("Première partie. Deuxième partie.");
    expect(anthropicMock.apiKeys).toEqual(["test-key-never-sent"]);
    expect(anthropicMock.create).toHaveBeenCalledOnce();

    const request = anthropicMock.create.mock.calls[0][0];
    expect(request.model).toBe("claude-sonnet-test");
    expect(request.max_tokens).toBe(1024);
    expect(request.messages).toHaveLength(1);
    expect(request.messages[0].role).toBe("user");
    expect(request.messages[0].content).toContain("SQL Injection");
    expect(request.messages[0].content).toContain("src/db.ts:12");
    expect(request.messages[0].content).toContain("SELECT");
  });

  it("utilise le modèle par défaut quand aucun modèle n'est fourni", async () => {
    anthropicMock.create.mockResolvedValue({
      content: [{ type: "text", text: "Analyse." }],
    });

    await explainIssue(context, {
      provider: "anthropic",
      model: "",
      apiKey: "test-key",
    });

    expect(anthropicMock.create.mock.calls[0][0].model).toBe("claude-opus-4-8");
  });

  it("refuse une clé absente sans instancier le client", async () => {
    await expect(
      explainIssue(context, { provider: "anthropic", model: "", apiKey: "" }),
    ).rejects.toThrow("Clé API requise");

    expect(anthropicMock.apiKeys).toHaveLength(0);
    expect(anthropicMock.create).not.toHaveBeenCalled();
  });

  it("refuse un fournisseur non supporté sans instancier le client", async () => {
    await expect(
      explainIssue(context, { provider: "openai", model: "", apiKey: "test-key" }),
    ).rejects.toThrow("Fournisseur IA non supporté : openai");

    expect(anthropicMock.apiKeys).toHaveLength(0);
    expect(anthropicMock.create).not.toHaveBeenCalled();
  });

  it("propage une erreur du SDK sans la masquer", async () => {
    anthropicMock.create.mockRejectedValue(new Error("Service Anthropic indisponible"));

    await expect(
      explainIssue(context, { provider: "anthropic", model: "", apiKey: "test-key" }),
    ).rejects.toThrow("Service Anthropic indisponible");
  });

  it("refuse une réponse réussie qui ne contient aucun texte", async () => {
    anthropicMock.create.mockResolvedValue({
      content: [{ type: "tool_use", name: "ignored" }],
    });

    await expect(
      explainIssue(context, { provider: "anthropic", model: "", apiKey: "test-key" }),
    ).rejects.toThrow("La réponse de l'API IA ne contient aucun texte.");
  });
});
