// Types métier partagés (aucun JSX, aucune dépendance UI).

export type Severity = "critical" | "warning" | "info";
export type SetupStep = 1 | 2 | 3 | 4 | 5;

export interface SubFolder {
  name: string;
  included: boolean;
  autoExcluded: boolean;
  children: SubFolder[];
}

export interface WatchedFolder {
  id: string;
  path: string;
  subFolders: SubFolder[];
  stack: string[];
  isBrowserFolder?: boolean;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  severity: Severity;
  category: string;
  enabled: boolean;
  triggerCount: number;
  pattern: string;
  targets: string[] | "all";
}

export interface Alert {
  id: string;
  skillId: string;
  file: string;
  folderPath: string;
  timestamp: Date;
  snippet: string;
  line: number;
  analysis?: string;
  analyzing?: boolean;
  resolved?: boolean;
  resolvedAt?: Date;
}
