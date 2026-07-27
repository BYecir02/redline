import { RuleTester } from "eslint";
import tsParser from "@typescript-eslint/parser";
import { rule } from "./rule";

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run("xss-risk", rule, {
  valid: [
    { code: `el.textContent = userInput;` },
    { code: `el.innerHTML = "";` },
    { code: `el.innerHTML = "<b>statique</b>";` },
    { code: `const x = <div>{userPost}</div>;` },
  ],
  invalid: [
    { code: `el.innerHTML = userInput;`, errors: [{ messageId: "innerHtml" }] },
    { code: `div.outerHTML = data;`, errors: [{ messageId: "innerHtml" }] },
    { code: `el.innerHTML = "<b>" + userInput + "</b>";`, errors: [{ messageId: "innerHtml" }] },
    {
      code: `const x = <div dangerouslySetInnerHTML={{ __html: userPost }} />;`,
      errors: [{ messageId: "dangerousJsx" }],
    },
  ],
});
