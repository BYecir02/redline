// Écran 1 — contrôleur du wizard : détient l'état/les handlers, compose les étapes.
import { useState, useEffect } from "react";
import { ShieldAlert, LogOut } from "lucide-react";
import { StepTab } from "../../ui/StepTab";
import { AnalysisConsole } from "./AnalysisConsole";
import { SessionHistory } from "./SessionHistory";
import { StepDossiers } from "./steps/StepDossiers";
import { StepStack } from "./steps/StepStack";
import { StepSousDossiers } from "./steps/StepSousDossiers";
import { StepApiKey } from "./steps/StepApiKey";
import { StepSkills } from "./steps/StepSkills";
import type { WatchedFolder, Skill, SetupStep, SubFolder } from "../../../domain/types";
import { ALL_SKILLS } from "../../../domain/catalog";
import { STACK_LANGUAGES, STACK_FRAMEWORKS, detectStack, guessProjectType } from "../../../domain/stack";
import { DEFAULT_AI_CONFIG, type AIConfig } from "../../../domain/ai";
import { generateSubFolders, toggleInTree, buildSubFoldersFromTree, applyExcluded } from "../../../domain/folders";
import { getTree, getProjects, type ProjectSummary } from "../../../api/client";
import { getDirectoryHandle, registerDirectoryHandle, getTreeFromHandle, pickDirectory, supportsDirectoryPicker, type DirHandle } from "../../../lib/browserWatch";

export function SetupScreen({ onLaunch, onViewHistory, userEmail, onLogout }: {
  onLaunch: (folders: WatchedFolder[], skills: Skill[], ai: AIConfig) => void;
  onViewHistory?: (projectPath: string) => void;
  userEmail?: string;
  onLogout?: () => void;
}) {
  const [step, setStep] = useState<SetupStep>(1);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisLines, setAnalysisLines] = useState<{ text: string; type: "info" | "ok" | "found" }[]>([]);
  const [folders, setFolders] = useState<WatchedFolder[]>([]);
  const [inputPath, setInputPath] = useState("");
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [ai, setAi] = useState<AIConfig>(DEFAULT_AI_CONFIG);
  const [showKey, setShowKey] = useState(false);
  const [skills, setSkills] = useState<Skill[]>(ALL_SKILLS);
  const [search, setSearch] = useState("");
  const [pastProjects, setPastProjects] = useState<ProjectSummary[]>([]);

  // Historique des sessions : projets déjà surveillés (persistés en base).
  useEffect(() => {
    let alive = true;
    getProjects()
      .then((p) => { if (alive) setPastProjects(p); })
      .catch(() => { /* backend indispo : pas d'historique proposé */ });
    return () => { alive = false; };
  }, []);

  const stackFor = (p: string): string[] => {
    const type = guessProjectType(p);
    return type === "node" ? ["javascript", "typescript"] : type === "python" ? ["python"] : [];
  };

  // Restaure les toggles de skills sauvegardés pour ce projet ; à défaut (projet
  // antérieur à cette fonctionnalité), on garde la sélection courante.
  const skillsFor = (saved: string[]): Skill[] =>
    saved.length > 0 ? ALL_SKILLS.map((s) => ({ ...s, enabled: saved.includes(s.id) })) : skills;

  // Reprendre un projet : relance la surveillance (l'historique continue via
  // réconciliation). Un chemin absolu = mode backend, repris directement. Un nom
  // de dossier nu = projet mode-navigateur : le navigateur ne persiste PAS l'accès,
  // donc on re-demande le dossier (le clic « Reprendre » est un geste utilisateur).
  // Construit l'arbre de sous-dossiers d'un projet repris, en réappliquant ses
  // exclusions sauvegardées. On lit le VRAI arbre du disque (repli : template).
  const subFoldersFor = async (
    path: string,
    excluded: string[],
    handle?: DirHandle,
  ): Promise<SubFolder[]> => {
    let tree: SubFolder[];
    try {
      tree = handle
        ? buildSubFoldersFromTree(await getTreeFromHandle(handle))
        : buildSubFoldersFromTree(await getTree(path));
    } catch {
      tree = generateSubFolders(path); // backend indispo / chemin invalide
    }
    return applyExcluded(tree, excluded);
  };

  const resumeProject = async (project: ProjectSummary) => {
    const isAbsolutePath = project.path.includes("/") || project.path.includes("\\");

    if (!isAbsolutePath && supportsDirectoryPicker()) {
      const handle = await pickDirectory();
      if (!handle) return; // sélection annulée
      const id = `f-${Date.now()}`;
      registerDirectoryHandle(id, handle);
      onLaunch(
        [{ id, path: handle.name, subFolders: await subFoldersFor(handle.name, project.excluded, handle), stack: stackFor(handle.name), isBrowserFolder: true }],
        skillsFor(project.skills),
        ai,
      );
      return;
    }

    onLaunch(
      [{ id: `f-${Date.now()}`, path: project.path, subFolders: await subFoldersFor(project.path, project.excluded), stack: stackFor(project.path) }],
      skillsFor(project.skills),
      ai,
    );
  };

  const runAnalysis = async () => {
    setAnalyzing(true);
    setAnalysisLines([]);

    // Map by ID to avoid index drift
    const detectedById: Record<string, string[]> = {};
    folders.forEach(f => { detectedById[f.id] = detectStack([f.path]); });

    // Lecture de l'arbre RÉEL du disque (repli : on garde l'arbre template
    // existant si le backend est indisponible ou le chemin invalide).
    const treeById: Record<string, SubFolder[]> = {};
    await Promise.all(folders.map(async (f) => {
      try {
        const handle = getDirectoryHandle(f.id);
        if (handle) {
          treeById[f.id] = buildSubFoldersFromTree(await getTreeFromHandle(handle));
        } else {
          treeById[f.id] = buildSubFoldersFromTree(await getTree(f.path));
        }
      } catch {
        /* backend indispo / chemin invalide */
      }
    }));

    const allDetected = [...new Set(Object.values(detectedById).flat())];
    const detectedLangs = allDetected.filter(d => STACK_LANGUAGES.some(l => l.id === d));
    const detectedFws = allDetected.filter(d => STACK_FRAMEWORKS.some(fw => fw.id === d));

    const lines: { text: string; type: "info" | "ok" | "found" }[] = [
      { text: `Analyse de ${folders.length} dossier${folders.length > 1 ? "s" : ""}...`, type: "info" },
      { text: `Structure lue : ${folders.map(f => f.path.split("/").pop()).join(", ")}`, type: "ok" },
      {
        text: detectedLangs.length > 0
          ? `Langages detectes : ${detectedLangs.map(id => STACK_LANGUAGES.find(l => l.id === id)?.label ?? id).join(", ")}`
          : "Aucun langage detecte - selection manuelle requise",
        type: detectedLangs.length > 0 ? "found" : "info",
      },
      {
        text: detectedFws.length > 0
          ? `Frameworks identifies : ${detectedFws.map(id => STACK_FRAMEWORKS.find(fw => fw.id === id)?.label ?? id).join(", ")}`
          : "Aucun framework detecte",
        type: detectedFws.length > 0 ? "found" : "info",
      },
      { text: "Stack pre-configuree - vous pouvez affiner ci-dessous", type: "ok" },
    ];

    lines.forEach((line, i) => {
      setTimeout(() => {
        setAnalysisLines(prev => [...prev, line]);
        if (i === lines.length - 1) {
          setTimeout(() => {
            // Apply detected stack by folder ID, then navigate to step 2
            setFolders(prev => prev.map(f => ({
              ...f,
              stack: (detectedById[f.id]?.length > 0) ? detectedById[f.id] : f.stack,
              subFolders: treeById[f.id] ?? f.subFolders,
            })));
            // Ensure the first folder is active so chips are visible immediately
            setActiveFolderId(prev => prev ?? folders[0]?.id ?? null);
            setAnalyzing(false);
            setStep(2);
          }, 600);
        }
      }, i * 450);
    });
  };

  const addFolder = () => {
    const trimmed = inputPath.trim();
    if (!trimmed) return;
    const type = guessProjectType(trimmed);
    const autoStack: string[] = type === "node" ? ["javascript", "typescript"] : type === "python" ? ["python"] : [];
    const newFolder: WatchedFolder = {
      id: `f-${Date.now()}`,
      path: trimmed,
      subFolders: generateSubFolders(trimmed),
      stack: autoStack,
    };
    setFolders((prev) => [...prev, newFolder]);
    setActiveFolderId(newFolder.id);
    setInputPath("");
  };

  const addFolderFromHandle = async (handle: DirHandle) => {
    const id = `f-${Date.now()}`;
    registerDirectoryHandle(id, handle);
    const type = guessProjectType(handle.name);
    const autoStack: string[] = type === "node" ? ["javascript", "typescript"] : type === "python" ? ["python"] : [];
    const newFolder: WatchedFolder = {
      id,
      path: handle.name,
      subFolders: generateSubFolders(handle.name),
      stack: autoStack,
      isBrowserFolder: true,
    };
    setFolders((prev) => [...prev, newFolder]);
    setActiveFolderId(id);
  };

  const toggleStackItem = (folderId: string, item: string) => {
    setFolders(prev => prev.map(f =>
      f.id !== folderId ? f : {
        ...f,
        stack: f.stack.includes(item) ? f.stack.filter(s => s !== item) : [...f.stack, item],
      }
    ));
  };

  const removeFolder = (id: string) => {
    setFolders((prev) => prev.filter((f) => f.id !== id));
    if (activeFolderId === id) setActiveFolderId(null);
  };

  const toggleSubFolder = (folderId: string, subPath: string) => {
    setFolders((prev) => prev.map((f) =>
      f.id === folderId
        ? { ...f, subFolders: toggleInTree(f.subFolders, subPath.split("/")) }
        : f
    ));
  };

  const toggleSkill = (id: string) =>
    setSkills((prev) => prev.map((s) => s.id === id ? { ...s, enabled: !s.enabled } : s));

  const categories = [...new Set(ALL_SKILLS.map((s) => s.category))];
  const enabledCount = skills.filter((s) => s.enabled).length;

  const activeFolder = folders.find((f) => f.id === activeFolderId);
  const allStack = [...new Set(folders.flatMap(f => f.stack))];
  const isRelevant = (skill: Skill) =>
    skill.targets === "all" || allStack.length === 0 ||
    (skill.targets as string[]).some(t => allStack.includes(t));

  const filteredSkills = (cat: string) =>
    skills.filter((s) => s.category === cat && isRelevant(s) && (
      search === "" || s.name.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase())
    ));

  const canGoStep2 = folders.length > 0;
  const canLaunch = folders.length > 0 && enabledCount > 0;

  const goTo = (s: SetupStep) => {
    // Toutes les étapes ≥ 2 nécessitent au moins un dossier.
    if (s === 1 || canGoStep2) setStep(s);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col" style={{ fontFamily: "'Outfit', sans-serif" }}>
      <header className="px-8 pt-7 pb-0 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-primary" />
          <span className="text-base font-medium tracking-widest uppercase text-foreground">redline</span>
        </div>
        {userEmail && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="truncate max-w-[200px]">{userEmail}</span>
            <button
              onClick={onLogout}
              title="Se déconnecter"
              className="flex items-center gap-1.5 hover:text-foreground transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> Déconnexion
            </button>
          </div>
        )}
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {analyzing && <AnalysisConsole lines={analysisLines} />}

        {!analyzing && <div className="w-full max-w-2xl">
          <div className="mb-8">
            <h1 className="text-2xl font-medium text-foreground mb-1.5">Configurer une session</h1>
            <p className="text-sm text-muted-foreground">Définissez ce que Redline surveille avant de lancer le monitoring.</p>
          </div>

          {/* Step tabs */}
          <div className="flex border border-border rounded overflow-hidden w-fit mb-8">
            {([
              { n: 1, label: "Dossiers" },
              { n: 2, label: "Stack" },
              { n: 3, label: "Sous-dossiers" },
              { n: 4, label: "Clé API" },
              { n: 5, label: "Skills" },
            ] as { n: SetupStep; label: string }[]).map(({ n, label }) => (
              <StepTab
                key={n} n={n} label={label}
                active={step === n}
                done={step > n}
                disabled={n >= 2 && !canGoStep2}
                onClick={() => goTo(n)}
              />
            ))}
          </div>

          {step === 1 && (
            <SessionHistory projects={pastProjects} onResume={resumeProject} onViewHistory={onViewHistory} />
          )}
          {step === 1 && (
            <StepDossiers
              inputPath={inputPath} onInputPathChange={setInputPath}
              onAddFolder={addFolder} folders={folders} onRemoveFolder={removeFolder}
              canNext={canGoStep2} onAnalyze={runAnalysis}
              onAddFolderFromHandle={addFolderFromHandle}
            />
          )}
          {step === 2 && (
            <StepStack
              folders={folders} activeFolderId={activeFolderId} activeFolder={activeFolder}
              onSelectFolder={setActiveFolderId} onToggleStackItem={toggleStackItem}
              onBack={() => setStep(1)} onNext={() => setStep(3)}
            />
          )}
          {step === 3 && (
            <StepSousDossiers
              folders={folders} activeFolderId={activeFolderId} activeFolder={activeFolder}
              onSelectFolder={setActiveFolderId} onToggleSubFolder={toggleSubFolder}
              onBack={() => setStep(2)} onNext={() => setStep(4)}
            />
          )}
          {step === 4 && (
            <StepApiKey
              ai={ai} onAiChange={setAi}
              showKey={showKey} onToggleShowKey={() => setShowKey((v) => !v)}
              onBack={() => setStep(3)} onNext={() => setStep(5)}
            />
          )}
          {step === 5 && (
            <StepSkills
              allStack={allStack} enabledCount={enabledCount}
              search={search} onSearchChange={setSearch}
              categories={categories} filteredSkills={filteredSkills} onToggleSkill={toggleSkill}
              canLaunch={canLaunch} onLaunch={() => onLaunch(folders, skills, ai)}
              onBack={() => setStep(4)}
            />
          )}
        </div>}
      </div>
    </div>
  );
}
