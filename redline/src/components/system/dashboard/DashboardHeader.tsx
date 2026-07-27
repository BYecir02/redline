// Barre supérieure du dashboard : compteurs + statut live + pause/arrêt.
import { ShieldAlert, Key, Circle, Eye, EyeOff, RefreshCw, LogOut } from "lucide-react";

export function DashboardHeader({
  criticalCount, total, enabledCount, totalSkills, apiKey, paused, onTogglePause, onRefresh, onOpenAiSettings, onStop, userEmail, onLogout,
}: {
  criticalCount: number;
  total: number;
  enabledCount: number;
  totalSkills: number;
  apiKey: string;
  paused: boolean;
  onTogglePause: () => void;
  onRefresh: () => void;
  onOpenAiSettings: () => void;
  onStop: () => void;
  userEmail?: string;
  onLogout?: () => void;
}) {
  return (
    <header className="border-b border-border px-6 py-3 flex items-center justify-between sticky top-0 z-20 bg-background/95 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <ShieldAlert className="w-4 h-4 text-primary" />
        <span className="font-medium tracking-widest uppercase">redline</span>
        <span className="text-muted-foreground text-sm">/ live</span>
      </div>
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span><span className="text-[#c0392b] font-medium">{criticalCount}</span> critique{criticalCount > 1 ? "s" : ""}</span>
          <span><span className="text-foreground font-medium">{total}</span> total</span>
          <span><span className="text-primary font-medium">{enabledCount}</span>/{totalSkills} skills</span>
          <button
            onClick={onOpenAiSettings}
            title="Configurer l'analyse par IA (fournisseur, modèle, clé)"
            className={`flex items-center gap-1 transition-colors ${apiKey ? "text-primary hover:opacity-80" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Key className="w-3 h-3" /> {apiKey ? "API active" : "Ajouter une clé"}
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <Circle className={`w-1.5 h-1.5 ${paused ? "fill-muted-foreground text-muted-foreground" : "fill-primary text-primary animate-pulse"}`} />
          <span className="text-sm text-muted-foreground">{paused ? "paused" : "live"}</span>
        </div>
        <button onClick={onRefresh} title="Vider et re-scanner tout maintenant" className="flex items-center gap-1.5 px-3 py-1 text-sm border border-border rounded hover:border-primary/40 hover:text-primary transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />
          Actualiser
        </button>
        <button onClick={onTogglePause} className="flex items-center gap-1.5 px-3 py-1 text-sm border border-border rounded hover:border-primary/40 hover:text-primary transition-colors">
          {paused ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          {paused ? "resume" : "pause"}
        </button>
        <button onClick={onStop} className="flex items-center gap-1.5 px-3 py-1 text-sm border border-border rounded hover:border-[#c0392b]/40 hover:text-[#c0392b] transition-colors">
          Arrêter
        </button>
        {userEmail && (
          <div className="flex items-center gap-2 pl-3 ml-1 border-l border-border">
            <span className="text-sm text-muted-foreground truncate max-w-[160px]" title={userEmail}>{userEmail}</span>
            <button
              onClick={onLogout}
              title="Se déconnecter"
              className="flex items-center gap-1.5 px-2 py-1 text-sm text-muted-foreground border border-border rounded hover:text-foreground hover:border-primary/40 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
