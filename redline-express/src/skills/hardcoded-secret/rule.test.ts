import { RuleTester } from "eslint";
import tsParser from "@typescript-eslint/parser";
import { rule } from "./rule";

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
  },
});

ruleTester.run("hardcoded-secret", rule, {
  valid: [
    // 1. Valeur lue depuis l'environnement (pas une string littérale).
    {
      code: `const apiKey = process.env.API_KEY;`,
    },
    // 2. Nom suspect mais valeur courte type locale.
    {
      code: `const key = "en";`,
    },
    // 3. Nom sans rapport avec un secret (même si la valeur est "riche").
    {
      code: `const userId = "aB3xY9zK1mN4pQ7rS2tU8vW";`,
    },
    // 4. Nom suspect mais valeur non crédible (pas de chiffre, < 20 car., pas de pattern connu).
    {
      code: `const passwordLabel = "Enter your password";`,
    },
    // 5. Nom sans rapport.
    {
      code: `const filePath = "/usr/local/bin/app";`,
    },
  ],
  invalid: [
    // 1. Pattern de clé connu Stripe (sk_live_).
    {
      code: `const stripeKey = "sk_live_abc123def456xyz";`,
      errors: [{ messageId: "hardcodedSecret" }],
    },
    // 2. Pattern AWS access key (AKIA).
    {
      code: `const apiSecret = "AKIAIOSFODNN7EXAMPLE";`,
      errors: [{ messageId: "hardcodedSecret" }],
    },
    // 3. JWT (eyJ).
    {
      code: `const jwtToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";`,
      errors: [{ messageId: "hardcodedSecret" }],
    },
    // 4. Proxy d'entropie : > 20 caractères, mélange maj/min/chiffres.
    {
      code: `const dbPassword = "aB3xY9zK1mN4pQ7rS2tU8vW";`,
      errors: [{ messageId: "hardcodedSecret" }],
    },
  ],
});
