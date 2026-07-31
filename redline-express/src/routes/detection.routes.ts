import { Router } from "express";
import {
  listIgnoredController,
  ignoreController,
  restoreAllController,
} from "../controllers/detection.controller.js";
import { requireAuth } from "../middlewares/requireAuth.js";

export const detectionRouter = Router();

// Gestion des ignorés, scopée par utilisateur → protégée.
detectionRouter.get("/ignored", requireAuth, listIgnoredController);
detectionRouter.post("/ignore", requireAuth, ignoreController);
detectionRouter.post("/restore-all", requireAuth, restoreAllController);
