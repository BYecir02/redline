// Historique des sessions : liste les projets déjà surveillés (persistés en base)
// avec leurs compteurs et leur dernière activité, et permet d'en reprendre un.
// Affiché à l'entrée du wizard quand l'utilisateur a déjà des projets.
import { History, FolderGit2, ArrowRight, BarChart3 } from "lucide-react";
import type { ProjectSummary } from "../../../api/client";

/** Dernier segment d'un chemin (nom du dossier), séparateurs / ou \\. */
function folderName(path: string): string {
  const parts = path.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

/** Ancienneté lisible d'un horodatage ISO. */
function fmtWhen(iso: string | null): string {
  if (!iso) return "jamais";
  const d = new Date(iso);
  const min = Math.floor((Date.now() - d.getTime()) / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const days = Math.floor(h / 24);
  if (days < 30) return `il y a ${days} j`;
  return d.toLocaleDateString("fr-FR");
}

export function SessionHistory({
  projects,
  onResume,
  onViewHistory,
}: {
  projects: ProjectSummary[];
  onResume: (project: ProjectSummary) => void;
  onViewHistory?: (projectPath: string) => void;
}) {
  if (projects.length === 0) return null;

  return (
    <div className="border border-border rounded bg-card p-4 mb-6">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground mb-3">
        <History className="w-3.5 h-3.5" /> Reprendre une session
      </div>
      <div className="space-y-2">
        {projects.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-3 rounded border border-border/60 px-3 py-2.5 hover:border-primary/40 transition-colors"
          >
            <FolderGit2 className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-sm text-foreground truncate">{folderName(p.path)}</div>
              <div className="text-xs text-muted-foreground truncate" title={p.path}>{p.path}</div>
            </div>
            <div className="hidden sm:flex items-center gap-3 text-xs shrink-0">
              <span className="text-[#c0392b]">{p.activeCount} actives</span>
              <span className="text-[#4a8a5a]">{p.resolvedCount} résolues</span>
              <span className="text-muted-foreground w-24 text-right">{fmtWhen(p.lastActivityAt)}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {onViewHistory && (
                <button
                  onClick={() => onViewHistory(p.path)}
                  title="Consulter les statistiques sans relancer la surveillance"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                >
                  <BarChart3 className="w-3.5 h-3.5" /> Voir l'historique
                </button>
              )}
              <button
                onClick={() => onResume(p)}
                title="Relancer la surveillance en direct de ce dossier"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity"
              >
                Reprendre <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
