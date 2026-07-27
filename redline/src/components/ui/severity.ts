// Maps de présentation par sévérité (couleurs, fonds, pastilles, icônes, libellés).
import { XCircle, AlertTriangle, Info } from "lucide-react";
import type { Severity } from "../../domain/types";

export const SEV_COLOR: Record<Severity, string> = {
  critical: "text-[#c0392b]",
  warning: "text-[#c49a2a]",
  info: "text-[#3a6a8a]",
};
export const SEV_BG: Record<Severity, string> = {
  critical: "bg-[#c0392b]/10 border-[#c0392b]/25",
  warning: "bg-[#c49a2a]/10 border-[#c49a2a]/25",
  info: "bg-[#3a6a8a]/10 border-[#3a6a8a]/25",
};
export const SEV_DOT: Record<Severity, string> = {
  critical: "bg-[#c0392b]",
  warning: "bg-[#c49a2a]",
  info: "bg-[#3a6a8a]",
};
export const SEV_ICON = { critical: XCircle, warning: AlertTriangle, info: Info };
export const SEV_LABEL: Record<Severity, string> = {
  critical: "Critique",
  warning: "Attention",
  info: "Info",
};
