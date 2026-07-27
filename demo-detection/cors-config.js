const cors = require("cors");

// Liste blanche d'origines de confiance, pilotée par l'environnement.
const allowedOrigins = (process.env.CORS_ORIGINS || "https://mon-app.example").split(",");

app.use(cors({ origin: allowedOrigins }));

// On ne renvoie l'en-tête que si l'origine de la requête est autorisée.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  next();
});
