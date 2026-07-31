import { defineConfig } from "vitest/config.js";

export default defineConfig({
  test: {
    // Requis par ESLint RuleTester, qui s'appuie sur les globals describe/it/afterAll.
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
