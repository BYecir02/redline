// Détection de stack (langages / frameworks) à partir des chemins de dossiers.
// Périmètre volontairement limité à l'écosystème JS/TS : c'est ce que le moteur
// d'analyse réel (ESLint) sait traiter. Ajouter un langage = ajouter un vrai
// analyseur côté backend, pas juste une entrée ici.

export type ProjectType = "node" | "python" | "generic";

export const STACK_LANGUAGES = [
  { id: "javascript", label: "JavaScript" },
  { id: "typescript", label: "TypeScript" },
];

export const STACK_FRAMEWORKS = [
  { id: "react", label: "React" },
  { id: "nextjs", label: "Next.js" },
  { id: "vue", label: "Vue" },
  { id: "express", label: "Express" },
  { id: "nestjs", label: "NestJS" },
];

export function guessProjectType(path: string): ProjectType {
  if (path.includes("py") || path.includes("django") || path.includes("flask")) return "python";
  if (path.includes("node") || path.includes("next") || path.includes("react") || path.includes("ts") || path.includes("js")) return "node";
  return "generic";
}

export function detectStack(paths: string[]): string[] {
  const p = paths.join(" ").toLowerCase();
  const detected: string[] = [];

  // Frameworks d'abord (plus spécifiques) — ils impliquent un langage.
  if (p.match(/next[.\-_/]|nextjs/)) { detected.push("nextjs", "typescript", "javascript"); }
  else if (p.match(/react[.\-_/]|create-react/)) { detected.push("react", "javascript"); }
  if (p.match(/nuxt[.\-_/]|vue[.\-_/]/)) { detected.push("vue", "javascript"); }
  if (p.match(/nest[.\-_/]|nestjs/)) { detected.push("nestjs", "typescript", "javascript"); }
  if (p.match(/express[.\-_/]/)) { detected.push("express", "javascript"); }

  // Langages (segments de chemin ou extensions).
  if (p.match(/[/\-_.]ts[/\-_.]|typescript|\.tsx?$/) && !detected.includes("typescript")) detected.push("typescript");
  if (p.match(/[/\-_.]js[/\-_.]|javascript|node[.\-_/]|\.jsx?$/) && !detected.includes("javascript")) detected.push("javascript");

  // Repli : si rien de détecté et que ça ressemble à du Node, on préselectionne JS/TS.
  if (detected.length === 0 && guessProjectType(paths[0] ?? "") === "node") {
    detected.push("javascript", "typescript");
  }

  return [...new Set(detected)];
}
