// Sidebar du dashboard : dossiers surveillés + skills par catégorie.
import { FolderOpen, ShieldAlert, Plus, RefreshCw } from "lucide-react";
import type { WatchedFolder, Skill } from "../../../domain/types";
import { CollapsibleBlock } from "../../ui/CollapsibleBlock";
import { FolderTree } from "../../ui/FolderTree";
import { Toggle } from "../../ui/Toggle";
import { SeverityBadge } from "../../ui/SeverityBadge";
import { SEV_DOT, SEV_COLOR } from "../../ui/severity";

export function SkillSidebar({
  folders, onToggleSubFolder, onOpenSettings, onRefreshTrees, refreshingTrees,
  categories, skills, isSkillRelevant, selectedSkill, onSelectSkill, onToggleSkill,
}: {
  folders: WatchedFolder[];
  onToggleSubFolder: (folderId: string, subPath: string) => void;
  onOpenSettings: () => void;
  onRefreshTrees: () => void;
  refreshingTrees: boolean;
  categories: string[];
  skills: Skill[];
  isSkillRelevant: (skill: Skill) => boolean;
  selectedSkill: string | null;
  onSelectSkill: (id: string | null) => void;
  onToggleSkill: (id: string) => void;
}) {
  return (
    <aside className="h-full flex flex-col gap-3 min-h-0">
      {/* Dossiers surveillés */}
      <CollapsibleBlock
        title="Dossiers surveillés"
        icon={FolderOpen}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onRefreshTrees(); }}
              disabled={refreshingTrees}
              className="text-muted-foreground/40 hover:text-primary transition-colors disabled:opacity-100"
              title="Relire l'arborescence du disque (détecte les dossiers ajoutés/supprimés)"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshingTrees ? "animate-spin text-primary" : ""}`} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onOpenSettings(); }}
              className="text-muted-foreground/40 hover:text-primary transition-colors"
              title="Gérer les dossiers"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        }
      >
        <div className="p-3 space-y-4">
          {folders.map((f) => (
            <FolderTree
              key={f.id}
              folder={f}
              onToggle={(subPath) => onToggleSubFolder(f.id, subPath)}
            />
          ))}
        </div>
      </CollapsibleBlock>

      {/* Skills par catégorie */}
      {categories.map((cat) => {
        const catSkills = skills.filter((s) => s.category === cat && isSkillRelevant(s));
        if (catSkills.length === 0) return null;
        return (
          <CollapsibleBlock key={cat} title={cat} icon={ShieldAlert}>
            <div className="divide-y divide-border/30">
              {catSkills.map((skill) => {
                const isSelected = selectedSkill === skill.id;
                return (
                  <div
                    key={skill.id}
                    className={`px-3 py-3 cursor-pointer transition-colors ${isSelected ? "bg-primary/5" : "hover:bg-muted/40"}`}
                    onClick={() => onSelectSkill(isSelected ? null : skill.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0 flex-1">
                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${SEV_DOT[skill.severity]} ${skill.enabled ? "opacity-100" : "opacity-20"}`} />
                        <div className="min-w-0">
                          <div className={`text-sm ${skill.enabled ? "text-foreground" : "text-muted-foreground"}`}>{skill.name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{skill.description}</div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <Toggle enabled={skill.enabled} onToggle={() => onToggleSkill(skill.id)} />
                        {skill.triggerCount > 0 && (
                          <span className={`text-xs font-medium tabular-nums ${SEV_COLOR[skill.severity]}`}>{skill.triggerCount}×</span>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <div className="bg-background rounded px-2.5 py-2 text-xs text-muted-foreground border border-border/50 font-mono leading-relaxed">
                          {skill.pattern}
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <SeverityBadge severity={skill.severity} />
                          <span className="text-xs text-muted-foreground">{skill.triggerCount} déclenchements</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CollapsibleBlock>
        );
      })}
    </aside>
  );
}
