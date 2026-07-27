import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { syncWatch, watchStreamUrl, scanCode, type WatchEvent, type BackendReport } from "../../../api/client";
import type { Alert } from "../../../domain/types";
import { getDirectoryHandle, collectFilesFromHandle } from "../../../lib/browserWatch";

/** Un dossier à surveiller côté UI (skills globaux, exclusion propre). */
export type WatchFolder = { id: string; path: string; exclude: string[]; isBrowserFolder?: boolean };

type FileEntry = { watchId: string; report: BackendReport };

/** Une alerte que la détection a confirmée disparue (résolution AUTOMATIQUE). */
type ResolvedEntry = {
  watchId: string;
  skillId: string;
  filename: string;
  line: number;
  snippet: string;
  scannedAt: string;
  resolvedAt: string;
};

/** État combiné : issues actives par fichier + issues résolues par la détection. */
type WatchState = { files: Map<string, FileEntry>; resolved: Map<string, ResolvedEntry> };

const alertId = (watchId: string, filename: string, skillId: string, line: number) =>
  `${watchId}:${filename}:${skillId}:${line}`;

/**
 * Surveillance réelle de PLUSIEURS dossiers. Un seul flux SSE ouvert ; les
 * watchers backend sont synchronisés déclarativement (POST /watch/sync) à chaque
 * changement de l'ensemble désiré. Chaque alerte est rattachée à son dossier via
 * le watchId de l'événement.
 *
 * Résolution AUTOMATIQUE, pilotée par la détection : quand un fichier est
 * re-scanné et qu'une issue présente au scan précédent a disparu, elle passe en
 * « résolue » — MAIS seulement si son skill est encore activé (désactiver un
 * skill ou exclure un dossier n'est pas une correction, on ne résout pas). Si une
 * issue résolue réapparaît, elle redevient active. Pas de « marquer résolu »
 * manuel : c'est la re-détection qui tranche.
 */
const isLocal =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "[::1]");

export function useWatchSessions(folders: WatchFolder[], skillIds: string[]) {
  const [state, setState] = useState<WatchState>({ files: new Map(), resolved: new Map() });
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Skills activés, en ref : lue dans le handler SSE (closure) pour distinguer une
  // vraie correction d'un skill qu'on vient de couper.
  const enabledSet = useMemo(() => new Set(skillIds), [skillIds]);
  const enabledRef = useRef(enabledSet);
  enabledRef.current = enabledSet;

  // On sépare les dossiers à surveiller par le navigateur (ceux qui ont un handle)
  // de ceux à surveiller par le backend (les chemins absolus collés en local).
  const { browserFolders, backendFolders } = useMemo(() => {
    const all = folders.filter((f) => f.path).map((f) => ({ id: f.id, path: f.path, skills: skillIds, exclude: f.exclude, isBrowserFolder: f.isBrowserFolder }));
    const browser: typeof all = [];
    const backend: typeof all = [];
    for (const f of all) {
      const isAbsolutePath = f.path.includes("/") || f.path.includes("\\");
      if (f.isBrowserFolder || !isAbsolutePath || getDirectoryHandle(f.id)) {
        browser.push(f);
      } else {
        backend.push(f);
      }
    }
    return { browserFolders: browser, backendFolders: backend };
  }, [folders, skillIds]);

  const handleEvent = (event: WatchEvent) => {
    const key = `${event.watchId}::${event.filename}`;
    setState((prev) => {
      const files = new Map(prev.files);
      const resolved = new Map(prev.resolved);

      if (event.type === "file") {
        const prevIssues = prev.files.get(key)?.report.issues ?? [];
        const report = event.report;
        const newIds = new Set(
          report.issues.map((i) => alertId(event.watchId, event.filename, i.skillId, i.line)),
        );

        // Issues disparues d'un fichier re-scanné → résolues (skill encore actif).
        for (const issue of prevIssues) {
          const id = alertId(event.watchId, event.filename, issue.skillId, issue.line);
          if (!newIds.has(id) && enabledRef.current.has(issue.skillId)) {
            resolved.set(id, {
              watchId: event.watchId,
              skillId: issue.skillId,
              filename: event.filename,
              line: issue.line,
              snippet: issue.before,
              scannedAt: report.scannedAt,
              resolvedAt: new Date().toISOString(),
            });
          }
        }
        // Issue de nouveau détectée → elle ressort de la liste résolue.
        for (const id of newIds) resolved.delete(id);

        files.set(key, { watchId: event.watchId, report });
      } else {
        // Fichier supprimé : ses alertes disparaissent, mais PAS en « résolu » :
        // on ne peut pas confirmer une correction sur un fichier absent.
        files.delete(key);
      }

      return { files, resolved };
    });
  };

  // --- MODE LOCAL : SSE + Sync Watchers Backend ---
  useEffect(() => {
    if (!isLocal || backendFolders.length === 0) {
      setConnected(false);
      return;
    }
    const source = new EventSource(watchStreamUrl);
    source.onopen = () => setConnected(true);
    source.onmessage = (e) => {
      const event: WatchEvent = JSON.parse(e.data);
      handleEvent(event);
    };
    source.onerror = () => {
      setConnected(false);
      setError("Flux de surveillance interrompu (le backend est-il lancé ?).");
    };
    return () => {
      source.close();
    };
  }, [isLocal, backendFolders.length]);

  const backendFoldersSignature = JSON.stringify(backendFolders.map(b => [b.id, b.path, b.exclude]));

  useEffect(() => {
    if (!isLocal) return;
    
    // Si on n'a plus de dossiers backend, on vide le watch côté backend
    if (backendFolders.length === 0) {
      syncWatch([]).catch(() => {});
      return;
    }

    setError(null);
    syncWatch(backendFolders).catch((e) => setError(String(e)));

    // Élague : dossiers backend retirés ET fichiers désormais EXCLUS par l'arbre.
    // (Les dossiers navigateur gardent leur état — c'est leur poll qui gère
    // l'exclusion.) Sans ça, décocher un sous-dossier laissait ses alertes traîner.
    const ids = new Set(backendFolders.map((d) => d.id));
    const excludeById = new Map(backendFolders.map((d) => [d.id, d.exclude]));
    const isExcluded = (watchId: string, filename: string) => {
      const ex = excludeById.get(watchId) ?? [];
      return ex.some((e) => filename === e || filename.startsWith(`${e}/`));
    };
    const keep = (watchId: string, filename: string) => {
      if (getDirectoryHandle(watchId)) return true;   // dossier navigateur : géré par son poll
      if (!ids.has(watchId)) return false;             // dossier plus surveillé
      return !isExcluded(watchId, filename);           // fichier désormais exclu → on retire
    };
    setState((prev) => {
      const files = new Map<string, FileEntry>();
      for (const [k, v] of prev.files) {
        const filename = k.split("::").slice(1).join("::");
        if (keep(v.watchId, filename)) files.set(k, v);
      }
      const resolved = new Map<string, ResolvedEntry>();
      for (const [k, v] of prev.resolved) {
        if (keep(v.watchId, v.filename)) resolved.set(k, v);
      }
      return { files, resolved };
    });
  }, [isLocal, backendFoldersSignature]);

  // --- MODE NAVIGATEUR : Polling des répertoires du navigateur ---
  const stampsRef = useRef<Map<string, number>>(new Map());
  const browserFoldersSignature = JSON.stringify(browserFolders.map(b => [b.id, b.path, b.exclude]));
  const handlesSignature = JSON.stringify(folders.map(f => !!getDirectoryHandle(f.id)));

  useEffect(() => {
    if (browserFolders.length === 0) {
      return;
    }

    const hasActiveHandles = browserFolders.some((f) => !!getDirectoryHandle(f.id));
    if (!hasActiveHandles) {
      setConnected(false);
      setError("Le navigateur ne conserve pas l'accès à un dossier après rechargement. Re-sélectionne le dossier pour reprendre la surveillance en direct (ou consulte l'historique en lecture seule).");
      return;
    }

    setConnected(true);
    setError(null);

    const poll = async () => {
      const nextStamps = new Map<string, number>();
      const currentKeys = new Set<string>();

      for (const folder of browserFolders) {
        const handle = getDirectoryHandle(folder.id);
        if (!handle) continue;

        try {
          const collected = await collectFilesFromHandle(handle, "", folder.exclude);
          for (const { path, file } of collected) {
            const key = `${folder.id}::${path}`;
            currentKeys.add(key);
            nextStamps.set(key, file.lastModified);

            const lastModified = stampsRef.current.get(key);
            const isUnchanged = lastModified === file.lastModified;

            if (isUnchanged) {
              continue;
            }

            try {
              const code = await file.text();
              const report = await scanCode(code, path, skillIds, folder.path, folder.exclude);
              handleEvent({
                type: "file",
                watchId: folder.id,
                filename: path,
                code,
                report,
              });
            } catch (err) {
              // Ignorer si échec d'un fichier
            }
          }
        } catch (err) {
          // Ignorer si échec d'accès au dossier
        }
      }

      // Détecter les fichiers supprimés pour les dossiers browser
      for (const key of stampsRef.current.keys()) {
        if (!currentKeys.has(key)) {
          const parts = key.split("::");
          const watchId = parts[0];
          const filename = parts.slice(1).join("::");
          
          if (browserFolders.some(bf => bf.id === watchId)) {
            handleEvent({
              type: "remove",
              watchId,
              filename,
            });
          }
        }
      }

      stampsRef.current = nextStamps;
    };

    poll();
    const interval = setInterval(poll, 2000);

    // Élague les dossiers browser qui ne sont plus surveillés
    const ids = new Set(browserFolders.map((d) => d.id));
    setState((prev) => {
      const files = new Map<string, FileEntry>();
      for (const [k, v] of prev.files) {
        if (!getDirectoryHandle(v.watchId) || ids.has(v.watchId)) {
          files.set(k, v);
        }
      }
      const resolved = new Map<string, ResolvedEntry>();
      for (const [k, v] of prev.resolved) {
        if (!getDirectoryHandle(v.watchId) || ids.has(v.watchId)) {
          resolved.set(k, v);
        }
      }
      return { files, resolved };
    });

    return () => {
      clearInterval(interval);
    };
  }, [browserFoldersSignature, skillIds, handlesSignature]);

  // Actualisation MANUELLE : vide l'état et force un re-scan complet.
  //  - navigateur : reset des empreintes → tout est re-scanné au prochain poll ;
  //  - backend : on redémarre les watchers (stop puis start) → chokidar ré-émet
  //    tous les fichiers (ignoreInitial:false), l'état se reconstruit à neuf.
  const refresh = useCallback(() => {
    setState({ files: new Map(), resolved: new Map() });
    stampsRef.current = new Map();
    if (isLocal && backendFolders.length > 0) {
      syncWatch([]).then(() => syncWatch(backendFolders)).catch((e) => setError(String(e)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendFoldersSignature]);

  const pathById = useMemo(() => new Map(folders.map((f) => [f.id, f.path])), [folders]);

  // Alertes ACTIVES : aplaties des rapports courants.
  const active = useMemo<Alert[]>(() => {
    const out: Alert[] = [];
    for (const { watchId, report } of state.files.values()) {
      const folderPath = pathById.get(watchId) ?? watchId;
      for (const issue of report.issues) {
        out.push({
          id: alertId(watchId, report.filename, issue.skillId, issue.line),
          skillId: issue.skillId,
          file: report.filename,
          folderPath,
          timestamp: new Date(report.scannedAt),
          snippet: issue.before,
          line: issue.line,
        });
      }
    }
    return out;
  }, [state.files, pathById]);

  // Alertes RÉSOLUES : confirmées disparues par la détection.
  const resolved = useMemo<Alert[]>(() => {
    const out: Alert[] = [];
    for (const r of state.resolved.values()) {
      out.push({
        id: alertId(r.watchId, r.filename, r.skillId, r.line),
        skillId: r.skillId,
        file: r.filename,
        folderPath: pathById.get(r.watchId) ?? r.watchId,
        timestamp: new Date(r.scannedAt),
        snippet: r.snippet,
        line: r.line,
        resolved: true,
        resolvedAt: new Date(r.resolvedAt),
      });
    }
    return out;
  }, [state.resolved, pathById]);

  return { active, resolved, connected, error, refresh };
}
