import { RuleTester } from "eslint";
import tsParser from "@typescript-eslint/parser";
import { rule } from "./rule";

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: { ecmaVersion: "latest", sourceType: "module" },
  },
});

ruleTester.run("todo-fixme", rule, {
  valid: [
    { code: `const x = 1; // simple note de documentation` },
    { code: `/* explication normale du code */ const y = 2;` },
    { code: `const todoList = []; // pas un tag dans un mot` },
  ],
  invalid: [
    { code: `const x = 1; // TODO: valider l'entrée`, errors: [{ messageId: "todoFixme" }] },
    { code: `/* FIXME: casse quand user est undefined */ const y = 2;`, errors: [{ messageId: "todoFixme" }] },
    {
      code: `// TODO: a\n// FIXME: b\nconst z = 3;`,
      errors: [{ messageId: "todoFixme" }, { messageId: "todoFixme" }],
    },
  ],
});
