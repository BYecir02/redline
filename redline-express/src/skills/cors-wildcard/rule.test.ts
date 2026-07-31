import { RuleTester } from "eslint";
import tsParser from "@typescript-eslint/parser";
import { rule } from "./rule";

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: { ecmaVersion: "latest", sourceType: "module" },
  },
});

ruleTester.run("cors-wildcard", rule, {
  valid: [
    { code: `res.setHeader("Content-Type", "application/json");` },
    { code: `res.setHeader("Access-Control-Allow-Origin", "https://app.example.com");` },
    { code: `cors({ origin: "https://app.example.com" });` },
    { code: `cors({ credentials: true });` },
  ],
  invalid: [
    { code: `res.setHeader("Access-Control-Allow-Origin", "*");`, errors: [{ messageId: "corsWildcard" }] },
    { code: `res.header("access-control-allow-origin", "*");`, errors: [{ messageId: "corsWildcard" }] },
    { code: `app.use(cors({ origin: "*" }));`, errors: [{ messageId: "corsWildcard" }] },
  ],
});
