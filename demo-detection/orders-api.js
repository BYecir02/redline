// API de commandes.
const router = require("express").Router();

router.get("/orders/:id", (req, res) => {
  // SQL par interpolation directe de l'entrée utilisateur (template literal).
  db.query(`SELECT * FROM orders WHERE id = ${req.params.id}`, (err, rows) => {
    console.debug("commande récupérée :", rows);
    res.json(rows);
  });
});

router.get("/orders", (req, res) => {
  // Promesse sans .catch() : un rejet non géré ferait planter le process.
  fetchOrders(req.query.status).then((orders) => res.json(orders));
});

module.exports = router;
