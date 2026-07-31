import { Router } from "express";
import { summaryController, trendsController } from "../controllers/stats.controller.js";
import { requireAuth } from "../middlewares/requireAuth.js";

export const statsRouter = Router();

// Toutes les analytics sont scopées par utilisateur → protégées.
statsRouter.get("/summary", requireAuth, summaryController);
statsRouter.get("/trends", requireAuth, trendsController);
