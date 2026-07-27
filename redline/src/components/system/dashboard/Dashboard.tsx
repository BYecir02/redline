// Écran 2 — contrôleur du dashboard. Branché sur le VRAI backend via
// useWatchSession : le flux d'alertes vient des ScanReport réels (plus de
// Math.random). Le résolu/l'analyse sont un overlay fusionné par id stable.
// Reste simulé pour l'instant : l'analyse IA (bouton « Analyser », M5).
import { useEffect, useMemo, useState } from "react";
import { History } from "lucide-react";
import { Resizable } from "re-resizable";
import type { WatchedFolder, Skill, Alert, Severity } from "../../../domain/types";
import type { AIConfig } from "../../../domain/ai";
import { ALL_SKILLS, AI_ANALYSES } from "../../../domain/catalog";
import { generateSubFolders, toggleInTree, collectExcluded, buildSubFoldersFromTree, mergeTree } from "../../../domain/folders";
import { SEV_LABEL } from "../../ui/severity";
import { analyzeIssue, getTree, getIgnored, ignoreDetection, restoreAllIgnored } from "../../../api/client";
import { useWatchSessions } from "./useWatchSession";
import { useStats } from "./useStats";
import { DashboardHeader } from "./DashboardHeader";
import { FoldersModal } from "./FoldersModal";
import { AiSettingsModal } from "./AiSettingsModal";
import { registerDirectoryHandle, getDirectoryHandle, getTreeFromHandle, pickDirectory, type DirHandle } from "../../../lib/browserWatch";
import { SkillSidebar } from "./SkillSidebar";
import { TrendChart } from "./TrendChart";
import { StatsPanel } from "./StatsPanel";
import { AlertsPanel } from "./AlertsPanel";
import { PromptModal } from "./PromptModal";
import { PromptPanel } from "./PromptPanel";

/** État applicatif ajouté à une alerte, hors détection (fusionné par id stable).
 *  Le résolu n'est PLUS ici : il est piloté par la détection (voir useWatchSessions).
 *  Ne reste que l'analyse IA à la demande. */
type OverlayEntry = { analysis?: string; analyzing?: boolean };

// Alertes « ignorées » (faux positifs assumés) : persistées à part de la session,
// et distinctes du « résolu ». On les identifie par une SIGNATURE DE CONTENU
// (dossier + fichier + skill + extrait) et non par l'id à la ligne : ainsi un
// ignore tient même si le code se décale de quelques lignes.
const IGNORED_KEY = "redline.ignored";

// Signature côté DB (propre au projet) : `fichier::skill::extrait` — sans le
// dossier, qui est porté par le projet. Le front la préfixe du dossier pour l'ignore local.
function dbSigOf(a: Alert): string {
  return `${a.file}::${a.skillId}::${a.snippet.trim()}`;
}
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

/** Vrai si la fenêtre est assez large pour la 3ᵉ colonne (sinon repli modal). */
function useIsWide(minWidth = 1100): boolean {
  const [wide, setWide] = useState(
    () => typeof window !== "undefined" && window.matchMedia(`(min-width:${minWidth}px)`).matches,
  );
  useEffect(() => {
    const mql = window.matchMedia(`(min-width:${minWidth}px)`);
    const onChange = () => setWide(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [minWidth]);
  return wide;
}


export function Dashboard({ folders, initialSkills, ai, onAiChange, onStop, userEmail, onLogout, historyProjectPath }: {
  folders: WatchedFolder[];
  initialSkills: Skill[];
  ai: AIConfig;
  onAiChange: (ai: AIConfig) => void;
  onStop: () => void;
  userEmail?: string;
  onLogout?: () => void;
  /** Si défini : mode lecture seule, stats scopées à ce projet (pas de surveillance). */
  historyProjectPath?: string;
}) {
  const [skills, setSkills] = useState<Skill[]>(initialSkills);
  const [overlay, setOverlay] = useState<Map<string, OverlayEntry>>(new Map());
  const [ignoredSigs, setIgnoredSigs] = useState<Set<string>>(loadIgnored);
  const [paused, setPaused] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAiSettings, setShowAiSettings] = useState(false);
  const [localFolders, setLocalFolders] = useState<WatchedFolder[]>(folders);
  const [settingsInputPath, setSettingsInputPath] = useState("");
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [alertTab, setAlertTab] = useState<"active" | "resolved">("active");
  const [filterSeverity, setFilterSeverity] = useState<Severity | "all">("all");
  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set());
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set());
  const [showPrompt, setShowPrompt] = useState(false);
  const [copied, setCopied] = useState(false);
  const [frozen, setFrozen] = useState<{ active: Alert[]; resolved: Alert[] }>({ active: [], resolved: [] });
  const isWide = useIsWide();

  // Surveillance réelle : on watch TOUS les dossiers configurés (skills globaux,
  // exclusion propre à chaque dossier). Actives ET résolues viennent de la
  // détection (le résolu est automatique, pas un clic).
  const enabledSkillIds = useMemo(() => skills.filter((s) => s.enabled).map((s) => s.id), [skills]);
  const watchFolders = useMemo(
    () => localFolders.map((f) => ({ id: f.id, path: f.path, exclude: collectExcluded(f.subFolders), isBrowserFolder: f.isBrowserFolder })),
    [localFolders],
  );
  const { active: liveActive, resolved: liveResolved, connected, error: watchError, refresh } =
    useWatchSessions(watchFolders, enabledSkillIds);
  const hasFolders = watchFolders.some((f) => f.path);

  // Persiste l'ensemble des alertes ignorées (faux positifs) à chaque changement.
  // Le localStorage sert de cache local ; la source de vérité est la base (chargée
  // ci-dessous au montage), ce qui permet aux ignores de suivre l'utilisateur.
  useEffect(() => {
    try { localStorage.setItem(IGNORED_KEY, JSON.stringify([...ignoredSigs])); } catch { /* stockage indispo */ }
  }, [ignoredSigs]);

  // Au montage : charge les ignores persistés en base et les fusionne avec le cache
  // local (union). Ainsi un ignore posé sur un autre poste réapparaît ici.
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

  // Pause = gel de l'affichage (actives + résolues) ; on continue de recevoir.
  useEffect(() => {
    if (!paused) setFrozen({ active: liveActive, resolved: liveResolved });
  }, [liveActive, liveResolved, paused]);
  const rawActive = paused ? frozen.active : liveActive;
  const rawResolved = paused ? frozen.resolved : liveResolved;

  // On écarte les alertes ignorées AVANT tout : elles disparaissent des compteurs,
  // du graphe, des onglets — plus nulle part, jusqu'à un « réafficher ».
  const baseActive = useMemo(() => rawActive.filter((a) => !ignoredSigs.has(sigOf(a))), [rawActive, ignoredSigs]);
  const baseResolved = useMemo(() => rawResolved.filter((a) => !ignoredSigs.has(sigOf(a))), [rawResolved, ignoredSigs]);
  const ignoredCount = (rawActive.length - baseActive.length) + (rawResolved.length - baseResolved.length);

  // Fusion overlay (analyse IA) par id stable, sur les deux listes.
  const withOverlay = (list: Alert[]) =>
    list.map((a) => { const o = overlay.get(a.id); return o ? { ...a, ...o } : a; });
  const activeAlerts = useMemo(() => withOverlay(baseActive), [baseActive, overlay]);
  const resolvedAlerts = useMemo(() => withOverlay(baseResolved), [baseResolved, overlay]);

  // Quand des alertes se résolvent/disparaissent (détection auto), on retire leurs
  // ids de la sélection et du dépliage — sinon le compteur « Générer le prompt (n) »
  // reste bloqué sur l'ancien total. La sélection ne garde que des alertes actives ;
  // le dépliage garde actives + résolues (une résolue reste consultable).
  useEffect(() => {
    const activeIds = new Set(activeAlerts.map((a) => a.id));
    const liveIds = new Set([...activeIds, ...resolvedAlerts.map((a) => a.id)]);
    const prune = (keepIds: Set<string>) => (prev: Set<string>) => {
      let changed = false;
      const next = new Set<string>();
      for (const id of prev) { if (keepIds.has(id)) next.add(id); else changed = true; }
      return changed ? next : prev;
    };
    setSelectedAlerts(prune(activeIds));
    setExpandedAlerts(prune(liveIds));
  }, [activeAlerts, resolvedAlerts]);

  // Skills enrichis du vrai nombre de déclenchements ACTIFS (pour la sidebar).
  const displaySkills = useMemo(
    () => skills.map((s) => ({ ...s, triggerCount: baseActive.filter((a) => a.skillId === s.id).length })),
    [skills, baseActive],
  );
  const severityBySkill = useMemo(() => {
    const m = new Map<string, Severity>();
    for (const s of skills) m.set(s.id, s.severity);
    return m;
  }, [skills]);

  const visibleAlerts = (alertTab === "active" ? activeAlerts : resolvedAlerts).filter((a) => {
    if (selectedSkill && a.skillId !== selectedSkill) return false;
    if (filterSeverity !== "all" && severityBySkill.get(a.skillId) !== filterSeverity) return false;
    return true;
  });
  const criticalCount = activeAlerts.filter((a) => severityBySkill.get(a.skillId) === "critical").length;

  const categories = [...new Set(ALL_SKILLS.map((s) => s.category))];
  const dashboardStack = [...new Set(localFolders.flatMap((f) => f.stack))];
  const isSkillRelevant = (skill: Skill) =>
    skill.targets === "all" || dashboardStack.length === 0 ||
    (skill.targets as string[]).some((t) => dashboardStack.includes(t));
  const selectedSkillName = displaySkills.find((s) => s.id === selectedSkill)?.name ?? null;

  // Synthèse + tendances : issues de l'historique persisté (Postgres), pas d'un
  // échantillonnage en mémoire. En pause, on cesse de rafraîchir.
  const { summary, trends } = useStats(paused, "minute", 4000, historyProjectPath);

  const toggleSkill = (id: string) => setSkills((prev) => prev.map((s) => s.id === id ? { ...s, enabled: !s.enabled } : s));

  const toggleSubFolderInDashboard = (folderId: string, subPath: string) => {
    setLocalFolders((prev) => prev.map((f) =>
      f.id === folderId ? { ...f, subFolders: toggleInTree(f.subFolders, subPath.split("/")) } : f,
    ));
  };

  const addFolderFromSettings = async () => {
    const trimmed = settingsInputPath.trim();
    if (!trimmed) return;
    const id = `f-${Date.now()}`;
    // Ajout immédiat avec un arbre template (feedback instantané)…
    setLocalFolders((prev) => [...prev, { id, path: trimmed, subFolders: generateSubFolders(trimmed), stack: [] }]);
    setSettingsInputPath("");
    // …puis remplacement par le VRAI arbre disque (repli : garde le template).
    try {
      const real = buildSubFoldersFromTree(await getTree(trimmed));
      setLocalFolders((prev) => prev.map((f) => (f.id === id ? { ...f, subFolders: real } : f)));
    } catch {
      /* backend indispo / chemin invalide */
    }
  };

  const addFolderFromHandleFromSettings = async (handle: DirHandle) => {
    const id = `f-${Date.now()}`;
    registerDirectoryHandle(id, handle);
    setLocalFolders((prev) => [...prev, { id, path: handle.name, subFolders: generateSubFolders(handle.name), stack: [], isBrowserFolder: true }]);
    try {
      const real = buildSubFoldersFromTree(await getTreeFromHandle(handle));
      setLocalFolders((prev) => prev.map((f) => (f.id === id ? { ...f, subFolders: real } : f)));
    } catch {
      /* echec */
    }
  };

  // Relit l'arbre RÉEL de chaque dossier surveillé et fusionne (les cases
  // décochées sont conservées, les nouveaux dossiers du disque apparaissent).
  const [refreshingTrees, setRefreshingTrees] = useState(false);
  const refreshTrees = async () => {
    setRefreshingTrees(true);
    try {
      const fresh = await Promise.all(
        localFolders.map(async (f) => {
          try {
            const handle = getDirectoryHandle(f.id);
            if (handle) {
              return { id: f.id, tree: buildSubFoldersFromTree(await getTreeFromHandle(handle)) };
            } else {
              return { id: f.id, tree: buildSubFoldersFromTree(await getTree(f.path)) };
            }
          } catch {
            return { id: f.id, tree: null };
          }
        }),
      );
      const byId = new Map(fresh.map((r) => [r.id, r.tree]));
      setLocalFolders((prev) =>
        prev.map((f) => {
          const tree = byId.get(f.id);
          return tree ? { ...f, subFolders: mergeTree(tree, f.subFolders) } : f;
        }),
      );
    } finally {
      setRefreshingTrees(false);
    }
  };

  const toggleAlertSelection = (id: string) => {
    setSelectedAlerts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedAlerts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Avec clé API → vraie analyse IA (backend). Sans clé → analyse de démo locale.
  const analyzeAlert = async (id: string) => {
    const alert = activeAlerts.find((a) => a.id === id);
    if (!alert) return;
    const skill = displaySkills.find((s) => s.id === alert.skillId);
    setOverlay((prev) => new Map(prev).set(id, { ...prev.get(id), analyzing: true }));
    try {
      let analysis: string;
      if (ai.apiKey) {
        const res = await analyzeIssue({
          apiKey: ai.apiKey,
          provider: ai.provider,
          model: ai.model,
          skillName: skill?.name ?? alert.skillId,
          category: skill?.category ?? "",
          severity: skill?.severity ?? "",
          filename: `${alert.folderPath}/${alert.file}`,
          line: alert.line,
          snippet: alert.snippet,
        });
        analysis = res.analysis;
      } else {
        await new Promise((r) => setTimeout(r, 800));
        analysis = AI_ANALYSES[alert.skillId] ?? "Analyse non disponible pour ce type de problème.";
      }
      setOverlay((prev) => new Map(prev).set(id, { ...prev.get(id), analyzing: false, analysis }));
    } catch (e) {
      setOverlay((prev) => new Map(prev).set(id, { ...prev.get(id), analyzing: false, analysis: `⚠️ ${String(e)}` }));
    }
  };

  // Ignorer = faux positif assumé : on mémorise la signature de contenu et on
  // nettoie sa sélection/dépliage. Persistant, distinct du « résolu » (auto).
  const ignoreAlert = (id: string) => {
    const alert = activeAlerts.find((a) => a.id === id);
    if (!alert) return;
    setIgnoredSigs((prev) => new Set(prev).add(sigOf(alert)));
    setSelectedAlerts((prev) => { const n = new Set(prev); n.delete(id); return n; });
    setExpandedAlerts((prev) => { const n = new Set(prev); n.delete(id); return n; });
    // Persistance base (best-effort) : l'ignore local prend le relais si ça échoue.
    ignoreDetection(alert.folderPath, dbSigOf(alert)).catch(() => {});
  };

  const clearIgnored = () => {
    setIgnoredSigs(new Set());
    restoreAllIgnored().catch(() => {});
  };

  const generatePrompt = () => {
    const selected = activeAlerts.filter((a) => selectedAlerts.has(a.id));
    const lines: string[] = [
      "Tu viens de travailler sur ce projet et Redline a détecté les problèmes suivants dans ton code. Corrige chacun d'eux précisément.",
      "",
      `Nombre de problèmes détectés : ${selected.length}`,
      "",
      "---",
      "",
    ];
    selected.forEach((alert, i) => {
      const skill = displaySkills.find((s) => s.id === alert.skillId);
      if (!skill) return;
      lines.push(`## Problème ${i + 1} - ${skill.name} (${SEV_LABEL[skill.severity]})`);
      lines.push(`**Fichier :** \`${alert.folderPath}/${alert.file}\``);
      lines.push(`**Type :** ${skill.description}`);
      lines.push(`**Code détecté :**`);
      lines.push(`\`\`\``);
      lines.push(alert.snippet);
      lines.push(`\`\`\``);
      if (alert.analysis) {
        lines.push(`**Contexte :** ${alert.analysis.replace(/\*\*/g, "").replace(/`/g, "")}`);
      }
      lines.push("");
    });
    lines.push("---");
    lines.push("");
    lines.push("Pour chaque problème, indique clairement quel fichier tu modifies et montre le code corrigé.");
    return lines.join("\n");
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(generatePrompt());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden" style={{ fontFamily: "'Outfit', sans-serif" }}>
      <DashboardHeader
        criticalCount={criticalCount}
        total={activeAlerts.length}
        enabledCount={skills.filter((s) => s.enabled).length}
        totalSkills={skills.length}
        apiKey={ai.apiKey}
        paused={paused}
        onTogglePause={() => setPaused((p) => !p)}
        onRefresh={refresh}
        onOpenAiSettings={() => setShowAiSettings(true)}
        onStop={onStop}
        userEmail={userEmail}
        onLogout={onLogout}
      />

      {showAiSettings && (
        <AiSettingsModal
          ai={ai}
          onSave={onAiChange}
          onClose={() => setShowAiSettings(false)}
        />
      )}

      {showSettings && (
        <FoldersModal
          folders={localFolders}
          inputPath={settingsInputPath} onInputPathChange={setSettingsInputPath}
          onAdd={addFolderFromSettings}
          onRemove={(id) => setLocalFolders((prev) => prev.filter((lf) => lf.id !== id))}
          onClose={() => setShowSettings(false)}
          onAddFromHandle={addFolderFromHandleFromSettings}
        />
      )}

      <div className="flex-1 min-h-0 flex gap-5 w-full px-6 py-5">
        {/* Sidebar */}
        <Resizable
          defaultSize={{ width: 300, height: "100%" }}
          minWidth={200}
          maxWidth={480}
          enable={{ right: true, left: false, top: false, bottom: false, topLeft: false, topRight: false, bottomLeft: false, bottomRight: false }}
          handleComponent={{
            right: (
              <div className="h-full w-3 flex items-center justify-center cursor-ew-resize group">
                <div className="w-px h-full bg-border/60 group-hover:bg-primary/40 group-hover:w-0.5 transition-all" />
              </div>
            ),
          }}
          className="shrink-0"
        >
          <SkillSidebar
            folders={localFolders}
            onToggleSubFolder={toggleSubFolderInDashboard}
            onOpenSettings={() => setShowSettings(true)}
            onRefreshTrees={refreshTrees}
            refreshingTrees={refreshingTrees}
            categories={categories}
            skills={displaySkills}
            isSkillRelevant={isSkillRelevant}
            selectedSkill={selectedSkill}
            onSelectSkill={setSelectedSkill}
            onToggleSkill={toggleSkill}
          />
        </Resizable>

        {/* Main */}
        <main className="flex-1 min-w-0 flex flex-col gap-4 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(42,31,20,0.1) transparent" }}>
          {historyProjectPath ? (
            <div className="border border-border rounded bg-card px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
              <History className="w-4 h-4 text-primary shrink-0" />
              <span>Historique de <span className="text-foreground font-medium">{historyProjectPath}</span> — lecture seule (pas de surveillance en direct).</span>
            </div>
          ) : !hasFolders ? (
            <div className="border border-border rounded bg-card px-4 py-3 text-sm text-muted-foreground">
              Aucun dossier configuré à surveiller.
            </div>
          ) : watchError ? (
            <div className="border border-[#c0392b]/25 bg-[#c0392b]/10 rounded px-4 py-3 text-sm text-[#c0392b] flex items-center justify-between gap-3">
              <span>{watchError}</span>
              {localFolders.some(f => f.isBrowserFolder && !getDirectoryHandle(f.id)) && (
                <button
                  onClick={async () => {
                    const disconnected = localFolders.filter(f => f.isBrowserFolder && !getDirectoryHandle(f.id));
                    for (const folder of disconnected) {
                      const handle = await pickDirectory();
                      if (handle) {
                        registerDirectoryHandle(folder.id, handle);
                      }
                    }
                    // Force a re-render to update the hook
                    setLocalFolders(prev => [...prev]);
                  }}
                  className="px-3 py-1 bg-[#c0392b] hover:bg-[#c0392b]/80 text-white rounded text-xs font-medium transition-colors shrink-0"
                >
                  Ré-autoriser maintenant
                </button>
              )}
            </div>
          ) : !connected ? (
            <div className="border border-border rounded bg-card px-4 py-3 text-sm text-muted-foreground">
              Connexion à la surveillance de {watchFolders.length} dossier{watchFolders.length > 1 ? "s" : ""}…
            </div>
          ) : null}

          <StatsPanel summary={summary} />
          <TrendChart trends={trends} />
          <AlertsPanel
            alertTab={alertTab} onAlertTabChange={setAlertTab}
            activeAlerts={activeAlerts} resolvedCount={resolvedAlerts.length} criticalCount={criticalCount}
            filterSeverity={filterSeverity} onFilterSeverityChange={setFilterSeverity} skills={displaySkills}
            selectedSkillName={selectedSkillName} onClearSelectedSkill={() => setSelectedSkill(null)}
            selectedCount={selectedAlerts.size}
            onOpenPrompt={() => setShowPrompt(true)}
            onClearSelection={() => setSelectedAlerts(new Set())}
            visibleAlerts={visibleAlerts} expandedAlerts={expandedAlerts} selectedAlerts={selectedAlerts}
            apiKey={ai.apiKey} tick={activeAlerts.length}
            ignoredCount={ignoredCount} onRestoreIgnored={clearIgnored}
            onToggleExpand={toggleExpand} onToggleSelect={toggleAlertSelection}
            onAnalyze={analyzeAlert} onIgnore={ignoreAlert}
          />
        </main>

        {/* 3ᵉ colonne : panneau prompt (non-bloquant), sur écran large uniquement. */}
        {showPrompt && isWide && (
          <Resizable
            defaultSize={{ width: 400, height: "100%" }}
            minWidth={320}
            maxWidth={640}
            enable={{ left: true, right: false, top: false, bottom: false, topLeft: false, topRight: false, bottomLeft: false, bottomRight: false }}
            handleComponent={{
              left: (
                <div className="h-full w-3 flex items-center justify-center cursor-ew-resize group">
                  <div className="w-px h-full bg-border/60 group-hover:bg-primary/40 group-hover:w-0.5 transition-all" />
                </div>
              ),
            }}
            className="shrink-0"
          >
            <PromptPanel
              selectedCount={selectedAlerts.size}
              promptText={generatePrompt()}
              copied={copied}
              onCopy={copyPrompt}
              onClose={() => setShowPrompt(false)}
            />
          </Resizable>
        )}
      </div>

      {/* Repli modal sur écran étroit (le panneau 3 colonnes s'écraserait). */}
      {showPrompt && !isWide && (
        <PromptModal
          selectedCount={selectedAlerts.size}
          promptText={generatePrompt()}
          copied={copied}
          onCopy={copyPrompt}
          onClose={() => setShowPrompt(false)}
        />
      )}
    </div>
  );
}
