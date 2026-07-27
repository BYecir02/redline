// Faux terminal d'analyse affiché pendant la détection de stack.
type Line = { text: string; type: "info" | "ok" | "found" };

export function AnalysisConsole({ lines }: { lines: Line[] }) {
  return (
    <div className="w-full max-w-2xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <h1 className="text-2xl font-medium text-foreground">Analyse en cours</h1>
        </div>
        <p className="text-sm text-muted-foreground">Redline inspecte la structure de vos dossiers pour détecter la stack.</p>
      </div>
      <div className="border border-border rounded bg-card overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border/50 bg-muted/30 flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-border" />
            <span className="w-2.5 h-2.5 rounded-full bg-border" />
            <span className="w-2.5 h-2.5 rounded-full bg-border" />
          </div>
          <span className="text-xs text-muted-foreground font-mono ml-1">redline — scan</span>
        </div>
        <div className="p-5 font-mono text-sm space-y-2.5 min-h-[180px]">
          {lines.map((line, i) => (
            <div key={i} className="flex items-start gap-2.5" style={{ animation: "fadeInUp 0.3s ease forwards" }}>
              <span className={`shrink-0 mt-0.5 ${
                line.type === "ok" ? "text-[#5a8a3a]" :
                line.type === "found" ? "text-primary" :
                "text-muted-foreground/50"
              }`}>
                {line.type === "ok" ? "✓" : line.type === "found" ? "→" : "·"}
              </span>
              <span className={
                line.type === "ok" ? "text-[#5a8a3a]" :
                line.type === "found" ? "text-foreground" :
                "text-muted-foreground"
              }>
                {line.text}
              </span>
            </div>
          ))}
          {lines.length < 5 && (
            <div className="flex items-center gap-1 text-muted-foreground/40">
              <span className="animate-pulse">_</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
