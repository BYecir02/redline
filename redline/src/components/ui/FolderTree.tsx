// Arbre de dossiers surveillés + nœud récursif de sous-dossier cochable.
import { useState } from "react";
import { ChevronRight, ChevronDown, Folder, FolderClosed } from "lucide-react";
import type { SubFolder, WatchedFolder } from "../../domain/types";

function SubFolderNode({ sf, depth, pathPrefix, onToggle }: {
  sf: SubFolder;
  depth: number;
  pathPrefix: string;
  onToggle: (path: string) => void;
}) {
  const [open, setOpen] = useState(depth === 0 && sf.children.length > 0 && !sf.autoExcluded);
  const path = pathPrefix ? `${pathPrefix}/${sf.name}` : sf.name;
  const hasChildren = sf.children.length > 0;
  const isExcluded = sf.autoExcluded;
  const isIncluded = sf.included && !sf.autoExcluded;

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-0.5 rounded px-1 transition-colors ${
          isExcluded
            ? "cursor-default"
            : isIncluded
              ? "bg-primary/8 cursor-pointer hover:bg-primary/12"
              : "cursor-pointer hover:bg-muted/40"
        }`}
        onClick={() => { if (!isExcluded) onToggle(path); }}
      >
        <button
          className={`w-3.5 h-3.5 shrink-0 flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground transition-colors ${!hasChildren ? "invisible" : ""}`}
          onClick={(e) => { e.stopPropagation(); if (hasChildren) setOpen(v => !v); }}
        >
          {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
        {isExcluded
          ? <FolderClosed className="w-3 h-3 text-muted-foreground/25 shrink-0" />
          : isIncluded
            ? <Folder className="w-3 h-3 text-primary shrink-0" />
            : <Folder className="w-3 h-3 text-muted-foreground/40 shrink-0" />
        }
        <span className={`text-xs font-mono truncate flex-1 ml-1 ${
          isExcluded ? "text-muted-foreground/25" : isIncluded ? "text-foreground" : "text-muted-foreground/65"
        }`}>
          {sf.name}
        </span>
        {isIncluded && <span className="w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0" />}
        {isExcluded && <span className="text-[10px] text-muted-foreground/25 shrink-0">✕</span>}
      </div>
      {open && hasChildren && (
        <div className="ml-4 border-l border-border/40 pl-1.5 mt-0.5 space-y-0.5">
          {sf.children.map(child => (
            <SubFolderNode key={child.name} sf={child} depth={depth + 1} pathPrefix={path} onToggle={onToggle} />
          ))}
        </div>
      )}
    </div>
  );
}

export function FolderTree({ folder, onToggle }: { folder: WatchedFolder; onToggle?: (path: string) => void }) {
  const [expanded, setExpanded] = useState(true);
  const rootName = folder.path.split("/").pop() || folder.path;
  const handleToggle = onToggle ?? (() => {});

  return (
    <div className="select-none">
      <div className="flex items-center gap-1.5 py-0.5 cursor-pointer group" onClick={() => setExpanded(v => !v)}>
        <span className="text-muted-foreground/50 w-3 shrink-0">
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </span>
        <Folder className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="text-sm text-foreground font-medium truncate flex-1" title={folder.path}>{rootName}</span>
        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 animate-pulse" />
      </div>
      {expanded && (
        <div className="ml-3 border-l border-border/50 pl-2 mt-0.5 space-y-0.5">
          {folder.subFolders.map(sf => (
            <SubFolderNode key={sf.name} sf={sf} depth={0} pathPrefix="" onToggle={handleToggle} />
          ))}
        </div>
      )}
    </div>
  );
}
