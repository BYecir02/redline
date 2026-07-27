// Badge coloré de sévérité (Critique / Attention / Info).
import type { Severity } from "../../domain/types";
import { SEV_BG, SEV_COLOR, SEV_LABEL } from "./severity";

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={`text-xs font-medium tracking-wider uppercase px-2 py-0.5 rounded border shrink-0 ${SEV_BG[severity]} ${SEV_COLOR[severity]}`}>
      {SEV_LABEL[severity]}
    </span>
  );
}
