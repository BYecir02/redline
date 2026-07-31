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

ruleTester.run("missing-error-handling", rule, {
  valid: [
    // 1. await encapsulé dans un try/catch.
    {
      code: [
        'router.get("/users", async (req, res) => {',
        "  try {",
        "    const users = await db.getUsers();",
        "    res.json(users);",
        "  } catch (err) {",
        "    res.sendStatus(500);",
        "  }",
        "});",
      ].join("\n"),
    },
    // 2. chaîne .then() avec un .catch().
    {
      code: [
        'router.post("/users", (req, res) => {',
        "  db.createUser(req.body)",
        "    .then((u) => res.json(u))",
        "    .catch(() => res.sendStatus(500));",
        "});",
      ].join("\n"),
    },
    // 3. handler purement synchrone.
    {
      code: [
        'router.get("/ping", (req, res) => {',
        '  res.send("pong");',
        "});",
      ].join("\n"),
    },
    // 4. .then(onOk, onErr) — second argument gère l'erreur.
    {
      code: [
        'router.get("/items", (req, res) => {',
        "  db.getItems().then((items) => res.json(items), () => res.sendStatus(500));",
        "});",
      ].join("\n"),
    },
  ],
  invalid: [
    // 1. await sans try/catch.
    {
      code: [
        'router.get("/users", async (req, res) => {',
        "  const users = await db.getUsers();",
        "  res.json(users);",
        "});",
      ].join("\n"),
      errors: [{ messageId: "missingErrorHandling" }],
    },
    // 2. .then() sans .catch().
    {
      code: [
        'router.post("/users", (req, res) => {',
        "  db.createUser(req.body).then((user) => res.json(user));",
        "});",
      ].join("\n"),
      errors: [{ messageId: "missingErrorHandling" }],
    },
    // 3. try/catch présent mais l'await est EN DEHORS du bloc try.
    {
      code: [
        'router.delete("/users/:id", async (req, res) => {',
        "  try {",
        "    validateId(req.params.id);",
        "  } catch (e) {",
        "    return res.sendStatus(400);",
        "  }",
        "  await db.remove(req.params.id);",
        "  res.sendStatus(204);",
        "});",
      ].join("\n"),
      errors: [{ messageId: "missingErrorHandling" }],
    },
  ],
});
