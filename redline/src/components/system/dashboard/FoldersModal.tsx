// Modal de gestion des dossiers surveillés (ajout / retrait) depuis le dashboard.
import { FolderOpen, X, Trash2, Plus } from "lucide-react";
import type { WatchedFolder } from "../../../domain/types";
import { countIncluded } from "../../../domain/folders";
import { supportsDirectoryPicker, pickDirectory, type DirHandle } from "../../../lib/browserWatch";

const isLocal =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "[::1]");

export function FoldersModal({
  folders, inputPath, onInputPathChange, onAdd, onRemove, onClose, onAddFromHandle
}: {
  folders: WatchedFolder[];
  inputPath: string;
  onInputPathChange: (v: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onClose: () => void;
  onAddFromHandle: (handle: DirHandle) => void;
}) {
  const canPick = supportsDirectoryPicker();

  const handlePick = async () => {
    const handle = await pickDirectory();
    if (handle) {
      onAddFromHandle(handle);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-xl mx-4 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-medium text-foreground flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-primary" /> Dossiers surveillés
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Folder list */}
        <div className="overflow-y-auto flex-1 p-4 space-y-2" style={{ scrollbarWidth: "thin" }}>
          {folders.length === 0 && (
            <div className="border border-dashed border-border rounded px-4 py-6 text-center text-sm text-muted-foreground/60">
              Aucun dossier surveillé
            </div>
          )}
          {folders.map((f) => (
            <div key={f.id} className="flex items-center justify-between gap-3 bg-background border border-border rounded px-3 py-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm text-foreground truncate">{f.path}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{countIncluded(f.subFolders)} sous-dossiers actifs</div>
                </div>
              </div>
              <button
                onClick={() => onRemove(f.id)}
                className="text-muted-foreground/40 hover:text-[#c0392b] transition-colors shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Add folder */}
        <div className="border-t border-border p-4 space-y-3">
          {canPick && (
            <button
              onClick={handlePick}
              className="w-full justify-center px-4 py-2 bg-primary text-primary-foreground rounded text-sm flex items-center gap-1.5 hover:opacity-90 transition-opacity"
            >
              📁 Choisir un dossier
            </button>
          )}

          {isLocal && (
            <>
              {canPick && <div className="text-center text-xs text-muted-foreground/60">— ou coller un chemin absolu —</div>}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputPath}
                  onChange={(e) => onInputPathChange(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && inputPath.trim()) onAdd(); }}
                  placeholder="/workspaces/nouveau-projet"
                  className="flex-1 bg-background border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
                />
                <button
                  onClick={onAdd}
                  className="px-3 py-2 bg-muted border border-border rounded text-sm hover:bg-muted/70 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity"
          >
            Appliquer
          </button>
        </div>
      </div>
    </div>
  );
}
