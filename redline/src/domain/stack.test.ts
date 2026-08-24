import { describe, expect, it } from "vitest";
import { detectStack, guessProjectType } from "./stack";

describe("detectStack", () => {
  it("détecte React et TypeScript depuis le manifeste et les fichiers", () => {
    expect(detectStack({
      projectPath: "projet-sans-indice-dans-le-nom",
      files: ["package.json", "tsconfig.json", "src/App.tsx"],
      packageJsonContents: [JSON.stringify({
        dependencies: { react: "18.3.1", "react-dom": "18.3.1" },
        devDependencies: { typescript: "5.6.3" },
      })],
    })).toEqual(["javascript", "typescript", "react"]);
  });

  it("agrège les frameworks déclarés dans plusieurs packages d'un monorepo", () => {
    expect(detectStack({
      files: [
        "apps/web/next.config.ts",
        "apps/web/src/page.tsx",
        "apps/api/nest-cli.json",
        "packages/ui/Button.vue",
      ],
      packageJsonContents: [
        JSON.stringify({ dependencies: { next: "15.0.0", react: "19.0.0", vue: "3.5.0" } }),
        JSON.stringify({ dependencies: { express: "4.21.0", "@nestjs/core": "11.0.0" } }),
      ],
    })).toEqual(["javascript", "typescript", "react", "nextjs", "vue", "express", "nestjs"]);
  });

  it("ne transforme plus un fragment de chemin ordinaire en projet TypeScript", () => {
    expect(detectStack({ projectPath: "C:/work/reports/archive" })).toEqual([]);
    expect(guessProjectType("C:/work/reports/archive")).toBe("generic");
  });

  it("utilise des segments explicites du chemin quand le contenu est inaccessible", () => {
    expect(detectStack({ projectPath: "/workspaces/client-react" }))
      .toEqual(["javascript", "react"]);
  });

  it("ignore un package.json invalide et poursuit avec les extensions", () => {
    expect(detectStack({
      files: ["package.json", "src/index.js"],
      packageJsonContents: ["{ manifeste invalide"],
    })).toEqual(["javascript"]);
  });
});
