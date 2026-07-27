// Étape 2 — sélection de la stack (langages + frameworks) par dossier.
import { ArrowRight } from "lucide-react";
import type { WatchedFolder } from "../../../../domain/types";
import { STACK_LANGUAGES, STACK_FRAMEWORKS } from "../../../../domain/stack";
import { FolderChips } from "../FolderChips";

export function StepStack({
  folders, activeFolderId, activeFolder, onSelectFolder, onToggleStackItem, onBack, onNext,
}: {
  folders: WatchedFolder[];
  activeFolderId: string | null;
  activeFolder: WatchedFolder | undefined;
  onSelectFolder: (id: string) => void;
  onToggleStackItem: (folderId: string, item: string) => void;
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
              {activeFolder.stack.length === 0
                ? "Aucune technologie sélectionnée - les skills universels seront actifs"
                : `${activeFolder.stack.length} technologie${activeFolder.stack.length > 1 ? "s" : ""} - les skills seront filtrés en conséquence`
              }
            </div>
          </div>
          <div className="p-4 space-y-5">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Langages</div>
              <div className="flex flex-wrap gap-2">
                {STACK_LANGUAGES.map(lang => (
                  <button
                    key={lang.id}
                    onClick={() => onToggleStackItem(activeFolder.id, lang.id)}
                    className={`px-3 py-1.5 text-sm rounded border transition-colors ${
                      activeFolder.stack.includes(lang.id)
                        ? "bg-primary/10 border-primary/40 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40"
                    }`}
                  >
                    {activeFolder.stack.includes(lang.id) && <span className="mr-1.5 text-xs">✓</span>}
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Frameworks & Librairies</div>
              <div className="flex flex-wrap gap-2">
                {STACK_FRAMEWORKS.map(fw => (
                  <button
                    key={fw.id}
                    onClick={() => onToggleStackItem(activeFolder.id, fw.id)}
                    className={`px-3 py-1.5 text-sm rounded border transition-colors ${
                      activeFolder.stack.includes(fw.id)
                        ? "bg-primary/10 border-primary/40 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40"
                    }`}
                  >
                    {activeFolder.stack.includes(fw.id) && <span className="mr-1.5 text-xs">✓</span>}
                    {fw.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Retour</button>
        <button onClick={onNext} className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity">
          Configurer les sous-dossiers <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
