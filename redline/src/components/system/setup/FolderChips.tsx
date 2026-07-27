// Sélecteur de dossier actif (chips), partagé par les étapes Stack et Sous-dossiers.
import type { WatchedFolder } from "../../../domain/types";

export function FolderChips({ folders, activeFolderId, onSelect }: {
  folders: WatchedFolder[];
  activeFolderId: string | null;
  onSelect: (id: string) => void;
}) {
  if (folders.length <= 1) return null;
  return (
    <div className="flex gap-2 flex-wrap">
      {folders.map((f) => (
        <button
          key={f.id}
          onClick={() => onSelect(f.id)}
          className={`px-3 py-1.5 text-xs rounded border transition-colors ${
            activeFolderId === f.id
              ? "bg-primary/10 border-primary/30 text-primary"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          {f.path.split("/").pop()}
        </button>
      ))}
    </div>
  );
}
