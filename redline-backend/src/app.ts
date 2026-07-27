import express, { type Express } from "express";
import { scanRouter } from "./routes/scan.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { statsRouter } from "./routes/stats.routes.js";
import { projectRouter } from "./routes/project.routes.js";
import { detectionRouter } from "./routes/detection.routes.js";
import { errorHandler } from "./middlewares/errorHandler.js";

/** Construit l'application Express (sans démarrer le serveur — testable). */
export function createApp(): Express {
  const app = express();

  // CORS (dev) : le front (Vite, port 5173) et l'API (port différent) sont sur
  // des origines distinctes → le navigateur exige ces en-têtes. Ouvert à toute
  // origine pour le développement ; à restreindre si exposé publiquement.
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.use(express.json({ limit: "2mb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/stats", statsRouter);
  app.use("/api/projects", projectRouter);
  app.use("/api/detections", detectionRouter);
  app.use("/api", scanRouter);

  // Middleware d'erreur monté en dernier.
  app.use(errorHandler);

  return app;
}
