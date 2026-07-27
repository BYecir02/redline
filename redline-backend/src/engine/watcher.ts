import { EventEmitter } from "node:events";
import { readFileSync } from "node:fs";
import path from "node:path";
import chokidar, { type FSWatcher } from "chokidar";
import { analyzeCode } from "./analyzer.js";
import type { ScanReport } from "../types/report.js";

/** Extensions surveillées. */
const WATCHABLE = /\.(js|jsx|ts|tsx)$/;
/** Dossiers ignorés (bruit / dépendances). */
const IGNORED = /(^|[\\/])(node_modules|dist|\.git|coverage)([\\/]|$)/;

/** Un fichier scanné, rattaché à son dossier surveillé (watchId). */
export type WatchFileEvent = {
  type: "file";
  watchId: string;
  filename: string;
  code: string;
  report: ScanReport;
};

/** Un fichier supprimé. */
export type WatchRemoveEvent = { type: "remove"; watchId: string; filename: string };

export type WatchEvent = WatchFileEvent | WatchRemoveEvent;

/** Spécification d'un dossier à surveiller. */
export type WatchSpec = {
  id: string;
  root: string;
  skills: string[];
  exclude: string[];
  /** Propriétaire du watcher (issu du JWT) : sert à isoler la persistance. */
  userId?: string;
};

/**
 * Adaptateur de persistance INJECTÉ (le moteur n'importe jamais la DB) : le
 * serveur y branche le dépôt Prisma au démarrage. Absent en test → aucun effet.
 * Toute erreur ici est avalée pour ne jamais interrompre la surveillance.
 */
export type WatchPersistence = {
  onScan: (userId: string, root: string, report: ScanReport) => Promise<void>;
  onRemove: (userId: string, root: string, file: string) => Promise<void>;
};

type WatchState = {
  watcher: FSWatcher;
  cache: Map<string, WatchFileEvent>;
  configHash: string;
  root: string;
  userId?: string;
};

/** Vrai si le chemin relatif est sous l'un des dossiers exclus (sélection UI). */
function isExcluded(rel: string, exclude: string[]): boolean {
  return exclude.some((ex) => rel === ex || rel.startsWith(`${ex}/`));
}

/** Empreinte de config : pour ne redémarrer un watcher que s'il a réellement changé. */
function hashSpec(spec: WatchSpec): string {
  return JSON.stringify([spec.root, [...spec.skills].sort(), [...spec.exclude].sort(), spec.userId ?? ""]);
}

/**
 * Surveille plusieurs dossiers en parallèle. Chaque dossier (identifié par un
 * `watchId` fourni par le client) a ses propres skills et exclusions. À chaque
 * ajout/modification d'un fichier surveillé, re-scanne et émet un événement
 * `event` taggé du watchId, pour que le client attribue l'alerte au bon dossier.
 *
 * Le backend tournant en local, il a un accès direct au système de fichiers.
 */
class WatchManager extends EventEmitter {
  private watchers = new Map<string, WatchState>();
  private persistence?: WatchPersistence;

  isActive(): boolean {
    return this.watchers.size > 0;
  }

  /** Branche l'adaptateur de persistance (appelé une fois au démarrage du serveur). */
  setPersistence(adapter: WatchPersistence): void {
    this.persistence = adapter;
  }

  /** Persiste un scan/suppression sans jamais faire échouer la surveillance. */
  private persist(fn: (p: WatchPersistence) => Promise<void>): void {
    if (!this.persistence) return;
    fn(this.persistence).catch((err) => {
      console.error("[watch] persistance échouée:", (err as Error).message);
    });
  }

  private async startOne(spec: WatchSpec): Promise<void> {
    await this.stopOne(spec.id);

    const { id, root, skills, exclude, userId } = spec;
    const cache = new Map<string, WatchFileEvent>();
    const watcher = chokidar.watch(root, {
      ignored: (target: string) => IGNORED.test(target),
      ignoreInitial: false,
      persistent: true,
    });
    this.watchers.set(id, { watcher, cache, configHash: hashSpec(spec), root, userId });

    const scan = async (absPath: string): Promise<void> => {
      if (!WATCHABLE.test(absPath)) return;
      const rel = path.relative(root, absPath).split(path.sep).join("/");
      if (isExcluded(rel, exclude)) return;

      let code: string;
      try {
        code = readFileSync(absPath, "utf8");
      } catch {
        return;
      }

      let report: ScanReport;
      try {
        report = await analyzeCode(code, rel, skills);
      } catch {
        // Fichier en cours d'édition (syntaxe invalide) : rapport vide plutôt que crash.
        report = { filename: rel, issues: [], scannedAt: new Date().toISOString() };
      }

      const event: WatchFileEvent = { type: "file", watchId: id, filename: rel, code, report };
      cache.set(rel, event);
      this.emit("event", event);
      // Persistance (historique/analytics) — best-effort, hors du flux temps réel.
      if (userId) this.persist((p) => p.onScan(userId, root, report));
    };

    watcher.on("add", scan);
    watcher.on("change", scan);
    watcher.on("unlink", (absPath: string) => {
      if (!WATCHABLE.test(absPath)) return;
      const rel = path.relative(root, absPath).split(path.sep).join("/");
      if (isExcluded(rel, exclude)) return;
      cache.delete(rel);
      const event: WatchRemoveEvent = { type: "remove", watchId: id, filename: rel };
      this.emit("event", event);
      if (userId) this.persist((p) => p.onRemove(userId, root, rel));
    });
  }

  private async stopOne(id: string): Promise<void> {
    const state = this.watchers.get(id);
    if (state) {
      await state.watcher.close();
      this.watchers.delete(id);
    }
  }

  /**
   * Synchronise l'ensemble des watchers avec la liste désirée :
   * arrête ceux qui ne sont plus voulus, (re)démarre ceux qui sont nouveaux ou
   * dont la config a changé, laisse les autres tels quels.
   */
  async sync(specs: WatchSpec[]): Promise<void> {
    const desired = new Set(specs.map((s) => s.id));
    for (const id of [...this.watchers.keys()]) {
      if (!desired.has(id)) await this.stopOne(id);
    }
    for (const spec of specs) {
      const existing = this.watchers.get(spec.id);
      if (!existing || existing.configHash !== hashSpec(spec)) {
        await this.startOne(spec);
      }
    }
  }

  /** Snapshot des fichiers déjà scannés, tous dossiers confondus (nouveau client SSE). */
  snapshot(): WatchFileEvent[] {
    const all: WatchFileEvent[] = [];
    for (const state of this.watchers.values()) {
      all.push(...state.cache.values());
    }
    return all;
  }

  /** Arrête tous les watchers. */
  async stopAll(): Promise<void> {
    for (const id of [...this.watchers.keys()]) {
      await this.stopOne(id);
    }
  }

  // --- Compat mono-dossier (ancien /watch/start | /watch/stop) -------------
  async start(root: string, skills: string[], exclude: string[] = [], userId?: string): Promise<void> {
    await this.sync([{ id: "default", root, skills, exclude, userId }]);
  }
  async stop(): Promise<void> {
    await this.stopAll();
  }
}

/** Instance unique partagée par les controllers. */
export const watchManager = new WatchManager();
