import { Router } from "express";
import {
  scanController,
  generateFixPromptController,
  listSkillsController,
} from "../controllers/scan.controller.js";
import {
  startWatchController,
  stopWatchController,
  watchStreamController,
  syncWatchController,
} from "../controllers/watch.controller.js";
import { analyzeIssueController } from "../controllers/analyze.controller.js";
import { treeController } from "../controllers/tree.controller.js";
import { requireAuth } from "../middlewares/requireAuth.js";

export const scanRouter = Router();

// Catalogue public (aucune donnée utilisateur).
scanRouter.get("/skills", listSkillsController);

// Scan/persistance rattachés à l'utilisateur → routes protégées.
scanRouter.post("/scan", requireAuth, scanController);
scanRouter.post("/generate-fix-prompt", requireAuth, generateFixPromptController);

// Arbre réel des sous-dossiers d'un dossier (pour la sélection à surveiller).
scanRouter.post("/tree", requireAuth, treeController);

// Analyse IA à la demande d'un problème (clé API fournie par l'utilisateur).
scanRouter.post("/analyze", requireAuth, analyzeIssueController);

// Surveillance temps réel. `sync` gère N dossiers ; start/stop = compat mono-dossier.
scanRouter.post("/watch/sync", requireAuth, syncWatchController);
scanRouter.post("/watch/start", requireAuth, startWatchController);
scanRouter.post("/watch/stop", requireAuth, stopWatchController);
// Flux SSE : EventSource ne peut pas porter d'en-tête Authorization → non protégé
// (lecture de l'état en mémoire ; l'isolation réelle se joue à l'écriture en base).
scanRouter.get("/watch/stream", watchStreamController);
