const router = require("express").Router();

// Clé lue depuis l'environnement, jamais en dur dans le code.
const API_KEY = process.env.API_KEY;

router.post("/login", async (req, res) => {
  try {
    const user = await findUser(req.body.email);
    res.json({ token: signToken(user, API_KEY) });
  } catch (err) {
    res.status(500).json({ error: "authentification impossible" });
  }
});

module.exports = router;
