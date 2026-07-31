import { Router } from "express";
import { listProjectsController } from "../controllers/project.controller.js";
import { requireAuth } from "../middlewares/requireAuth.js";

export const projectRouter = Router();

// Historique des projets/sessions, scopé par utilisateur → protégé.
projectRouter.get("/", requireAuth, listProjectsController);
