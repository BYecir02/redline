// Gestion des alertes « ignorées » (faux positifs assumés), isolée du Dashboard.
//
// Une alerte ignorée est identifiée par une SIGNATURE DE CONTENU (dossier +
// fichier + skill + extrait) et non par l'id à la ligne : ainsi un ignore tient
// même si le code se décale de quelques lignes. C'est distinct du « résolu »
// (piloté automatiquement par la détection).
//
// Persistance : le localStorage sert de cache local, la base est la source de
// vérité (chargée au montage et fusionnée), ce qui fait suivre les ignores d'un
// poste à l'autre.
import { useCallback, useEffect, useState } from "react";
import type { Alert } from "../../../domain/types";
import { getIgnored, ignoreDetection, restoreAllIgnored } from "../../../api/client";

const IGNORED_KEY = "redline.ignored";

// Signature côté DB (propre au projet) : `fichier::skill::extrait` - sans le
// dossier, qui est porté par le projet.
function dbSigOf(a: Alert): string {
  return `${a.file}::${a.skillId}::${a.snippet.trim()}`;
}
// Signature locale : préfixée du dossier (le front gère plusieurs dossiers).
function sigOf(a: Alert): string {
  return `${a.folderPath}::${dbSigOf(a)}`;
}

function loadIgnored(): Set<string> {
  try {
    const raw = localStorage.getItem(IGNORED_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export interface IgnoredDetections {
  /** Vrai si l'alerte est marquée comme faux positif. */
  isIgnored: (a: Alert) => boolean;
  /** Ignore une alerte (persistance base best-effort, cache local en repli). */
  ignore: (a: Alert) => void;
  /** Réaffiche toutes les alertes ignorées. */
  clearIgnored: () => void;
}

export function useIgnoredDetections(): IgnoredDetections {
  const [ignoredSigs, setIgnoredSigs] = useState<Set<string>>(loadIgnored);

  // Persiste l'ensemble à chaque changement (cache local).
  useEffect(() => {
    try { localStorage.setItem(IGNORED_KEY, JSON.stringify([...ignoredSigs])); } catch { /* stockage indispo */ }
  }, [ignoredSigs]);

  // Au montage : charge les ignores persistés en base et les fusionne (union).
  useEffect(() => {
    let alive = true;
    getIgnored()
      .then((entries) => {
        if (!alive || entries.length === 0) return;
        setIgnoredSigs((prev) => {
          const next = new Set(prev);
          for (const e of entries) next.add(`${e.projectPath}::${e.signature}`);
          return next;
        });
      })
      .catch(() => { /* backend indispo : on garde le cache local */ });
    return () => { alive = false; };
  }, []);

  // Identités stables (useCallback) : évite de recalculer les listes dérivées du
  // Dashboard à chaque rendu et de re-render les enfants sans raison.
  const isIgnored = useCallback((a: Alert) => ignoredSigs.has(sigOf(a)), [ignoredSigs]);

  const ignore = useCallback((a: Alert) => {
    setIgnoredSigs((prev) => new Set(prev).add(sigOf(a)));
    // Persistance base (best-effort) : l'ignore local prend le relais si ça échoue.
    ignoreDetection(a.folderPath, dbSigOf(a)).catch(() => {});
  }, []);

  const clearIgnored = useCallback(() => {
    setIgnoredSigs(new Set());
    restoreAllIgnored().catch(() => {});
  }, []);

  return { isIgnored, ignore, clearIgnored };
}
