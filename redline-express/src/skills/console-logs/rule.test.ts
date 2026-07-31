import { RuleTester } from "eslint";
import tsParser from "@typescript-eslint/parser";
import { rule } from "./rule";

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: { ecmaVersion: "latest", sourceType: "module" },
  },
});

ruleTester.run("console-logs", rule, {
  valid: [
    { code: `console.error("erreur réelle");` },
    { code: `console.warn("avertissement légitime");` },
    { code: `logger.log("via un vrai logger");` },
    { code: `const console = { log() {} }; other.log("x");` },
  ],
  invalid: [
    { code: `console.log("debug user:", userData);`, errors: [{ messageId: "consoleLog" }] },
    { code: `console.debug("état", state);`, errors: [{ messageId: "consoleLog" }] },
    { code: `console.info("token:", authToken);`, errors: [{ messageId: "consoleLog" }] },
  ],
});
