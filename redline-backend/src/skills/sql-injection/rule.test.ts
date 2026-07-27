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

ruleTester.run("sql-injection", rule, {
  valid: [
    // 1. Requête paramétrée : string statique + valeurs dans un tableau séparé.
    {
      code: `db.query("SELECT * FROM users WHERE id = ?", [req.body.id]);`,
    },
    // 2. Template literal sans entrée utilisateur (variable locale déjà validée).
    {
      code: [
        "const safeId = validate(input);",
        "db.query(`SELECT * FROM users WHERE id = ${safeId}`);",
      ].join("\n"),
    },
    // 3. Chaîne entièrement statique.
    {
      code: `connection.execute("SELECT COUNT(*) FROM sessions");`,
    },
    // 4. req.body présent mais pas dans un appel .query/.execute (autre méthode).
    {
      code: `logger.info("payload " + req.body.id);`,
    },
    // 5. Variable indirecte mais initialiseur sûr (pas de req.*).
    {
      code: [
        'const q = "SELECT * FROM users WHERE id = " + userId;',
        "db.query(q);",
      ].join("\n"),
    },
    // 6. Limite de portée assumée : la déclaration est dans un bloc PARENT,
    //    pas dans le même bloc que l'appel → non résolue, donc non signalée.
    {
      code: [
        'const q = "SELECT * FROM users WHERE id = " + req.body.id;',
        "function handler() {",
        "  db.query(q);",
        "}",
      ].join("\n"),
    },
  ],
  invalid: [
    // 1. Concaténation directe avec req.body.
    {
      code: `db.query("SELECT * FROM users WHERE id = " + req.body.id);`,
      errors: [{ messageId: "sqlInjection" }],
    },
    // 2. Template literal interpolant req.query.
    {
      code: "connection.execute(`SELECT * FROM t WHERE name = '${req.query.name}'`);",
      errors: [{ messageId: "sqlInjection" }],
    },
    // 3. Concaténation imbriquée avec req.params au milieu.
    {
      code: `pool.query("SELECT * FROM logs WHERE user = " + req.params.userId + " ORDER BY ts");`,
      errors: [{ messageId: "sqlInjection" }],
    },
    // 4. Variable indirecte (même bloc) : concat avec req.body.
    {
      code: [
        'const q = "SELECT * FROM users WHERE id = " + req.body.id;',
        "db.query(q);",
      ].join("\n"),
      errors: [{ messageId: "sqlInjection" }],
    },
    // 5. Variable indirecte (même bloc) : template literal avec req.query.
    {
      code: [
        "const sql = `DELETE FROM t WHERE name = '${req.query.name}'`;",
        "connection.execute(sql);",
      ].join("\n"),
      errors: [{ messageId: "sqlInjection" }],
    },
    // 6. Cas réaliste : requête construite en variable puis passée à .query()
    //    dans un handler (concat avec req.params).
    {
      code: [
        "router.post('/bookings', async (req, res) => {",
        "  const q = 'INSERT INTO bookings VALUES (' + req.params.id + ')';",
        "  await db.query(q);",
        "  res.send('ok');",
        "});",
      ].join("\n"),
      errors: [{ messageId: "sqlInjection" }],
    },
  ],
});
