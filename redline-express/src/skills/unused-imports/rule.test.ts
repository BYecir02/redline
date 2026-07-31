import { RuleTester } from "eslint";
import tsParser from "@typescript-eslint/parser";
import { rule } from "./rule";

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: { ecmaVersion: "latest", sourceType: "module" },
  },
});

ruleTester.run("unused-imports", rule, {
  valid: [
    { code: `import { useState } from "react"; useState();` },
    { code: `import fs from "fs"; fs.readFileSync("x");` },
    { code: `import "./styles.css";` },
    { code: `import { a, b } from "m"; use(a, b);` },
    { code: `import * as ns from "m"; ns.foo();` },
  ],
  invalid: [
    { code: `import { unused } from "m"; const x = 1;`, errors: [{ messageId: "unusedImport" }] },
    { code: `import lodash from "lodash"; const x = 1;`, errors: [{ messageId: "unusedImport" }] },
    { code: `import { a, b } from "m"; use(a);`, errors: [{ messageId: "unusedImport" }] },
  ],
});
