// Étape 3 — arbre de sous-dossiers cochable (ce qu'on surveille réellement).
import { ArrowRight } from "lucide-react";
import type { WatchedFolder } from "../../../../domain/types";
import { countIncluded } from "../../../../domain/folders";
import { FolderTree } from "../../../ui/FolderTree";
import { FolderChips } from "../FolderChips";

export function StepSousDossiers({
  folders, activeFolderId, activeFolder, onSelectFolder, onToggleSubFolder, onBack, onNext,
}: {
  folders: WatchedFolder[];
  activeFolderId: string | null;
  activeFolder: WatchedFolder | undefined;
  onSelectFolder: (id: string) => void;
  onToggleSubFolder: (folderId: string, subPath: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-4">
      <FolderChips folders={folders} activeFolderId={activeFolderId} onSelect={onSelectFolder} />

      {activeFolder && (
        <div className="border border-border rounded bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60 bg-muted/30">
            <div className="text-sm font-medium text-foreground">{activeFolder.path}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {countIncluded(activeFolder.subFolders)} dossiers surveillés - cliquez pour activer / désactiver
            </div>
          </div>
          <div className="p-4">
            <FolderTree
              folder={activeFolder}
              onToggle={(subPath) => onToggleSubFolder(activeFolder.id, subPath)}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Retour</button>
        <button onClick={onNext} className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity">
          Configurer la clé API <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
