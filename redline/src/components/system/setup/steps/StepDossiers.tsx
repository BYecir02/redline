// Étape 1 — ajout / liste des dossiers racine à surveiller.
import { FolderOpen, Plus, Trash2, ArrowRight } from "lucide-react";
import type { WatchedFolder } from "../../../../domain/types";
import { countIncluded } from "../../../../domain/folders";
import { supportsDirectoryPicker, pickDirectory, type DirHandle } from "../../../../lib/browserWatch";

const isLocal =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "[::1]");

export function StepDossiers({
  inputPath, onInputPathChange,
  onAddFolder, folders, onRemoveFolder, canNext, onAnalyze,
  onAddFolderFromHandle,
}: {
  inputPath: string;
  onInputPathChange: (v: string) => void;
  onAddFolder: () => void;
  folders: WatchedFolder[];
  onRemoveFolder: (id: string) => void;
  canNext: boolean;
  onAnalyze: () => void;
  onAddFolderFromHandle: (handle: DirHandle) => void;
}) {
  const canPick = supportsDirectoryPicker();

  const handlePick = async () => {
    const handle = await pickDirectory();
    if (handle) {
      onAddFolderFromHandle(handle);
    }
  };

  return (
    <div className="space-y-4">
      <div className="border border-border rounded bg-card p-5 space-y-4">
        <div className="text-xs text-muted-foreground uppercase tracking-widest">Ajouter un dossier racine</div>
        
        {canPick && (
          <button
            onClick={handlePick}
            className="w-full justify-center px-4 py-2.5 bg-primary text-primary-foreground rounded text-sm flex items-center gap-1.5 hover:opacity-90 transition-opacity"
          >
            📁 Choisir un dossier depuis le navigateur
          </button>
        )}

        {isLocal && (
          <div className="space-y-2">
            {canPick && <div className="text-center text-xs text-muted-foreground/60">— ou coller un chemin absolu —</div>}
            <div className="flex gap-2">
              <input
                type="text" value={inputPath}
                onChange={(e) => onInputPathChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onAddFolder()}
                placeholder="/workspaces/mon-projet"
                className="flex-1 bg-background border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
              />
              <button onClick={onAddFolder} className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm flex items-center gap-1.5 hover:opacity-90 transition-opacity">
                <Plus className="w-4 h-4" /> Ajouter
              </button>
            </div>
          </div>
        )}

        {!isLocal && !canPick && (
          <p className="text-xs text-[#c0392b] bg-[#c0392b]/10 border border-[#c0392b]/25 rounded px-3 py-2">
            La surveillance de dossier nécessite Chrome, Edge ou Opera pour fonctionner directement depuis le navigateur. Sur Safari ou Firefox, veuillez lancer l'application en local.
          </p>
        )}

        {folders.length === 0 ? (
          <div className="border border-dashed border-border rounded px-4 py-8 text-center text-sm text-muted-foreground/60">
            <FolderOpen className="w-7 h-7 mx-auto mb-2 opacity-30" />
            Aucun dossier ajouté
          </div>
        ) : (
          <div className="space-y-2">
            {folders.map((f) => (
              <div key={f.id} className="flex items-center justify-between gap-3 bg-background border border-border rounded px-3 py-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm text-foreground truncate">{f.path}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{countIncluded(f.subFolders)} sous-dossiers inclus</div>
                  </div>
                </div>
                <button onClick={() => onRemoveFolder(f.id)} className="text-muted-foreground/40 hover:text-[#c0392b] transition-colors shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex justify-end">
        <button onClick={() => canNext && onAnalyze()} disabled={!canNext}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded disabled:opacity-40 hover:opacity-90 transition-opacity">
          Analyser et définir la stack <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
