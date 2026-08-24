// Libellés de sévérité (connaissance métier pure, sans dépendance UI).
import type { Severity } from "./types";

export const SEV_LABEL: Record<Severity, string> = {
  critical: "Critique",
  warning: "Attention",
  info: "Info",
};
