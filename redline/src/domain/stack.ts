// Détection de stack à partir d'indices réels : fichiers, configurations et
// dépendances déclarées. Le nom du dossier ne sert que de repli lorsque le
// navigateur ne peut pas inspecter son contenu.

export type ProjectType = "node" | "python" | "generic";

export type StackEvidence = {
  projectPath?: string;
  files?: string[];
  packageJsonContents?: string[];
};

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

const pathSegments = (path: string): string[] =>
  path.toLowerCase().split(/[\\/_.\-\s]+/).filter(Boolean);

export function guessProjectType(path: string): ProjectType {
  const segments = new Set(pathSegments(path));
  if (["python", "django", "flask", "pyproject"].some((marker) => segments.has(marker))) {
    return "python";
  }
  if (["node", "nodejs", "javascript", "typescript", "react", "next", "nextjs", "vue", "express", "nestjs"]
    .some((marker) => segments.has(marker))) {
    return "node";
  }
  return "generic";
}

function dependencyNames(manifests: string[]): Set<string> {
  const names = new Set<string>();
  for (const raw of manifests) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      for (const field of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]) {
        const dependencies = parsed[field];
        if (!dependencies || typeof dependencies !== "object" || Array.isArray(dependencies)) continue;
        Object.keys(dependencies).forEach((name) => names.add(name.toLowerCase()));
      }
    } catch {
      // Un manifeste illisible ne doit pas empêcher l'analyse des autres indices.
    }
  }
  return names;
}

const hasExtension = (files: string[], extensions: string[]): boolean =>
  files.some((file) => extensions.some((extension) => file.endsWith(extension)));

const hasConfig = (files: string[], pattern: RegExp): boolean =>
  files.some((file) => pattern.test(file.split("/").pop() ?? file));

/** Détecte uniquement les technologies réellement prises en charge par le moteur. */
export function detectStack(evidence: StackEvidence): string[] {
  const files = (evidence.files ?? []).map((file) => file.replaceAll("\\", "/").toLowerCase());
  const manifests = evidence.packageJsonContents ?? [];
  const dependencies = dependencyNames(manifests);

  const hasTypeScript =
    dependencies.has("typescript")
    || hasExtension(files, [".ts", ".tsx", ".mts", ".cts"])
    || hasConfig(files, /^tsconfig(?:\.[^.]+)?\.json$/);
  const hasJavaScript =
    manifests.length > 0
    || files.some((file) => file.endsWith("package.json"))
    || hasExtension(files, [".js", ".jsx", ".mjs", ".cjs"]);

  const hasNext = dependencies.has("next") || hasConfig(files, /^next\.config\.(?:js|mjs|cjs|ts)$/);
  const hasReact =
    hasNext
    || dependencies.has("react")
    || dependencies.has("react-dom")
    || hasExtension(files, [".jsx", ".tsx"]);
  const hasVue =
    dependencies.has("vue")
    || [...dependencies].some((name) => name.startsWith("@vue/"))
    || hasExtension(files, [".vue"])
    || hasConfig(files, /^vue\.config\.(?:js|mjs|cjs|ts)$/);
  const hasExpress = dependencies.has("express");
  const hasNest =
    [...dependencies].some((name) => name.startsWith("@nestjs/"))
    || hasConfig(files, /^nest-cli\.json$/);

  const detected: string[] = [];
  if (hasJavaScript || hasTypeScript || hasReact || hasVue || hasNext || hasExpress || hasNest) {
    detected.push("javascript");
  }
  if (hasTypeScript) detected.push("typescript");
  if (hasReact) detected.push("react");
  if (hasNext) detected.push("nextjs");
  if (hasVue) detected.push("vue");
  if (hasExpress) detected.push("express");
  if (hasNest) detected.push("nestjs");

  // Aucun contenu accessible : repli limité à des segments explicites du chemin.
  if (detected.length === 0 && files.length === 0 && manifests.length === 0) {
    const segments = new Set(pathSegments(evidence.projectPath ?? ""));
    if (["node", "nodejs", "javascript", "typescript", "react", "next", "nextjs", "vue", "express", "nestjs"]
      .some((marker) => segments.has(marker))) {
      detected.push("javascript");
    }
    if (["typescript", "ts"].some((marker) => segments.has(marker))) detected.push("typescript");
    if (segments.has("react")) detected.push("react");
    if (segments.has("next") || segments.has("nextjs")) detected.push("nextjs");
    if (segments.has("vue")) detected.push("vue");
    if (segments.has("express")) detected.push("express");
    if (segments.has("nest") || segments.has("nestjs")) detected.push("nestjs");
  }

  return [...new Set(detected)];
}
