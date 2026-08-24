// Layout racine : porte d'authentification, puis bascule wizard de setup ↔ dashboard.
// La session (dossiers, skills, clé API) est persistée en localStorage : un
// refresh ramène directement au dashboard au lieu de repartir de zéro.
import { lazy, Suspense, useEffect, useState } from "react";
import { SetupScreen } from "../components/system/setup/SetupScreen";
import { AuthScreen } from "../components/system/auth/AuthScreen";
import { DesktopViewportGuard } from "../components/system/layout/DesktopViewportGuard";
import { fetchMe, logout as clearAuth, type AuthUser } from "../api/auth";
import type { WatchedFolder, Skill } from "../domain/types";
import { ALL_SKILLS } from "../domain/catalog";
import { DEFAULT_AI_CONFIG, type AIConfig } from "../domain/ai";

// Chargé à la demande : isole recharts + react-markdown (lourds) dans un chunk
// séparé, récupéré seulement au passage sur le dashboard.
const Dashboard = lazy(() =>
  import("../components/system/dashboard/Dashboard").then((m) => ({ default: m.Dashboard })),
);

const STORAGE_KEY = "redline.session";

type SessionConfig = {
  folders: WatchedFolder[];
  skills: Skill[];
  ai: AIConfig;
  /** Si défini : dashboard en lecture seule sur l'historique de ce projet. */
  historyProjectPath?: string;
};

/** Recharge la session persistée (null si absente ou illisible). */
function loadSession(): SessionConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SessionConfig> & { apiKey?: string };
    // Migration d'une session pré-fournisseurs (clé seule → config IA complète).
    const ai: AIConfig = parsed.ai ?? { ...DEFAULT_AI_CONFIG, apiKey: parsed.apiKey ?? "" };
    return { folders: parsed.folders ?? [], skills: parsed.skills ?? [], ai, historyProjectPath: parsed.historyProjectPath };
  } catch {
    return null;
  }
}

export default function App() {
  // Phase d'auth : undefined = vérification en cours, null = déconnecté, user = connecté.
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);
  const [config, setConfig] = useState<SessionConfig | null>(() => loadSession());

  // Au démarrage : si un jeton existe, on le valide auprès du backend (/auth/me).
  useEffect(() => {
    let alive = true;
    fetchMe()
      .then((u) => { if (alive) setUser(u); })
      .catch(() => { if (alive) setUser(null); });
    return () => { alive = false; };
  }, []);

  // Persiste (ou efface) la session à chaque changement.
  useEffect(() => {
    try {
      if (config) localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* stockage indisponible : on reste en mémoire pour cette session */
    }
  }, [config]);

  const handleLogout = () => {
    clearAuth();
    setConfig(null); // on ne laisse pas la config d'un compte à un autre
    setUser(null);
  };

  // Vérification du jeton en cours : écran neutre (évite un flash de login).
  if (user === undefined) {
    return <div className="min-h-screen bg-background" />;
  }

  // Non connecté : porte d'authentification.
  if (!user) {
    return <AuthScreen onAuthed={setUser} />;
  }

  // Connecté + session configurée : dashboard.
  if (config) {
    return (
      <DesktopViewportGuard>
        <Suspense fallback={<div className="min-h-screen bg-background" />}>
          <Dashboard
            folders={config.folders}
            initialSkills={config.skills}
            ai={config.ai}
            onAiChange={(ai) => setConfig((c) => (c ? { ...c, ai } : c))}
            onStop={() => setConfig(null)}
            userEmail={user.email}
            onLogout={handleLogout}
            historyProjectPath={config.historyProjectPath}
          />
        </Suspense>
      </DesktopViewportGuard>
    );
  }

  // Connecté sans session : wizard de configuration.
  return (
    <DesktopViewportGuard>
      <SetupScreen
        onLaunch={(folders, skills, ai) => setConfig({ folders, skills, ai })}
        onViewHistory={(projectPath) =>
          setConfig({ folders: [], skills: ALL_SKILLS, ai: DEFAULT_AI_CONFIG, historyProjectPath: projectPath })
        }
        userEmail={user.email}
        onLogout={handleLogout}
      />
    </DesktopViewportGuard>
  );
}
