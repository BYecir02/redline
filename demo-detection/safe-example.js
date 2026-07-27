// Contre-exemple : code correct. L'outil ne DOIT rien signaler ici — c'est ce
// qui prouve la précision (pas juste du bruit sur tout ce qui bouge).
const router = require("express").Router();

// Secret lu depuis l'environnement, pas en dur.
const API_KEY = process.env.STRIPE_KEY;

router.get("/users/:id", async (req, res) => {
  try {
    // Requête paramétrée : la valeur passe par un placeholder, pas par concaténation.
    const rows = await db.query("SELECT * FROM users WHERE id = ?", [req.params.id]);
    res.json({ rows, key: API_KEY ? "configurée" : "absente" });
  } catch (err) {
    res.status(500).json({ error: "erreur interne" });
  }
});

module.exports = router;
