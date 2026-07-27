// Aperçu markdown du prompt de correction. IMPORTANT : ce n'est qu'un rendu pour
// la lecture — le bouton « Copier » copie toujours le markdown BRUT (avec les
// **, ##, ``` ), car c'est cette structure qui aide l'IA à qui on l'envoie.
import ReactMarkdown from "react-markdown";

export function PromptMarkdown({ text }: { text: string }) {
  return (
    <div className="text-xs text-foreground/80 leading-relaxed [&>*+*]:mt-2">
      <ReactMarkdown
        components={{
          h1: ({ children }) => <h3 className="text-sm font-semibold text-foreground mt-3 first:mt-0">{children}</h3>,
          h2: ({ children }) => <h3 className="text-sm font-semibold text-foreground mt-3 first:mt-0">{children}</h3>,
          h3: ({ children }) => <h4 className="text-xs font-semibold text-foreground mt-2">{children}</h4>,
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          p: ({ children }) => <p>{children}</p>,
          hr: () => <hr className="border-border/60" />,
          ul: ({ children }) => <ul className="list-disc pl-4 space-y-0.5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-4 space-y-0.5">{children}</ol>,
          code: ({ children }) => <code className="font-mono text-[11px]">{children}</code>,
          pre: ({ children }) => (
            <pre className="font-mono bg-background border border-border rounded p-2.5 text-[11px] overflow-x-auto whitespace-pre-wrap">
              {children}
            </pre>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
