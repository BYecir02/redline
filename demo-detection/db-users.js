// Récupération d'un utilisateur par son id.
const express = require("express");
const router = express.Router();

router.get("/users/:id", (req, res) => {
  // Requête paramétrée : l'id passe par un placeholder, pas par concaténation.
  db.query("SELECT * FROM users WHERE id = ?", [req.params.id], (err, rows) => {
    res.json(rows);
  });
});

module.exports = router;
