import { existsSync, statSync } from "node:fs";
import type { NextFunction, Request, Response } from "express";
import { watchManager, type WatchEvent, type WatchSpec } from "../engine/watcher.js";
import { upsertProjectConfig } from "../db/projectRepo.js";
import { HttpError } from "../middlewares/errorHandler.js";

/**
 * POST /api/watch/sync
 * Entrée : { watchers: [{ id, path, skills, exclude? }] }
 * Surveille EXACTEMENT cet ensemble de dossiers (le backend calcule le diff :
 * arrête ce qui n'est plus voulu, (re)démarre ce qui change). Un tableau vide
 * arrête toute surveillance.
 */
export async function syncWatchController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { watchers } = req.body as { watchers?: unknown };
    if (!Array.isArray(watchers)) {
      throw new HttpError(400, "`watchers` doit être un tableau.");
    }

    const specs: WatchSpec[] = [];
    for (const raw of watchers) {
      const { id, path: dirPath, skills, exclude } = (raw ?? {}) as {
        id?: unknown;
        path?: unknown;
        skills?: unknown;
        exclude?: unknown;
      };

      if (typeof id !== "string" || id.length === 0) {
        throw new HttpError(400, "Chaque watcher requiert un `id` non vide.");
      }
      if (typeof dirPath !== "string" || dirPath.length === 0) {
        throw new HttpError(400, "Chaque watcher requiert un `path` non vide.");
      }
      if (!Array.isArray(skills) || !skills.every((s) => typeof s === "string")) {
        throw new HttpError(400, "`skills` doit être un tableau de chaînes.");
      }
      if (exclude !== undefined && (!Array.isArray(exclude) || !exclude.every((e) => typeof e === "string"))) {
        throw new HttpError(400, "`exclude` doit être un tableau de chaînes.");
      }
      if (!existsSync(dirPath) || !statSync(dirPath).isDirectory()) {
        throw new HttpError(400, `\`path\` inexistant ou non-dossier : ${dirPath}`);
      }

      specs.push({
        id,
        root: dirPath,
        skills: skills as string[],
        exclude: (exclude as string[] | undefined) ?? [],
        userId: req.userId,
      });
    }

    await watchManager.sync(specs);

    // Mémorise la config de skills par projet (pour la reprise de session).
    // Best-effort : n'interrompt pas la surveillance si la DB est indisponible.
    if (req.userId) {
      const userId = req.userId;
      await Promise.all(
        specs.map((s) =>
          upsertProjectConfig(userId, s.root, { skills: s.skills, excluded: s.exclude }).catch((err) =>
            console.error("[watch] config non persistée:", (err as Error).message),
          ),
        ),
      );
    }

    res.json({ status: "syncing", active: specs.map((s) => s.id) });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/watch/start
 * Entrée : { path: string (dossier existant), skills: string[] (non vide) }
 * Démarre la surveillance temps réel du dossier.
 */
export async function startWatchController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { path: dirPath, skills, exclude } = req.body as {
      path?: unknown;
      skills?: unknown;
      exclude?: unknown;
    };

    if (typeof dirPath !== "string" || dirPath.length === 0) {
      throw new HttpError(400, "`path` est requis et doit être une chaîne non vide.");
    }
    if (
      !Array.isArray(skills) ||
      skills.length === 0 ||
      !skills.every((s) => typeof s === "string")
    ) {
      throw new HttpError(400, "`skills` est requis (tableau non vide de chaînes).");
    }
    // `exclude` est optionnel : sous-dossiers décochés à ne pas surveiller.
    if (exclude !== undefined && (!Array.isArray(exclude) || !exclude.every((e) => typeof e === "string"))) {
      throw new HttpError(400, "`exclude` doit être un tableau de chaînes.");
    }
    if (!existsSync(dirPath) || !statSync(dirPath).isDirectory()) {
      throw new HttpError(400, "`path` doit être un dossier existant.");
    }

    await watchManager.start(dirPath, skills as string[], (exclude as string[] | undefined) ?? [], req.userId);
    res.json({ status: "watching", path: dirPath });
  } catch (err) {
    next(err);
  }
}

/** POST /api/watch/stop — arrête la surveillance en cours. */
export async function stopWatchController(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await watchManager.stop();
    res.json({ status: "stopped" });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/watch/stream — flux SSE.
 * Envoie d'abord un snapshot des fichiers déjà scannés, puis chaque mise à jour
 * en temps réel. Reste ouvert jusqu'à déconnexion du client.
 */
export function watchStreamController(req: Request, res: Response): void {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const send = (event: WatchEvent): void => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  // Snapshot initial : l'état courant de tous les fichiers déjà scannés.
  for (const event of watchManager.snapshot()) {
    send(event);
  }

  const listener = (event: WatchEvent): void => send(event);
  watchManager.on("event", listener);

  // Ping de maintien de connexion (commentaire SSE, ignoré par le client).
  const keepAlive = setInterval(() => res.write(": ping\n\n"), 25000);

  req.on("close", () => {
    clearInterval(keepAlive);
    watchManager.off("event", listener);
  });
}
