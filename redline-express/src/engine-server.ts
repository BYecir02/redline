// Serveur minimal du MOTEUR D'ANALYSE (découplé du framework).
// Expose uniquement POST /analyze : code -> rapport. Aucune authentification,
// aucune base de données. C'est le backend Symfony qui orchestre et appelle ce
// service en interne (réseau Docker).
import express from "express";
import { analyzeCode } from "./engine/analyzer.js";

const app = express();
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/analyze", async (req, res) => {
  const { code, filename, skills } = req.body ?? {};
  if (typeof code !== "string" || typeof filename !== "string" || !Array.isArray(skills)) {
    res.status(400).json({
      error: "Champs requis : code (string), filename (string), skills (string[]).",
    });
    return;
  }
  try {
    const report = await analyzeCode(code, filename, skills);
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: "Échec de l'analyse.", detail: String(err) });
  }
});

const port = Number(process.env.ENGINE_PORT ?? 4000);
app.listen(port, () => {
  console.log(`Moteur d'analyse Redline en écoute sur http://0.0.0.0:${port}`);
});
