import { useEffect, useState, type ReactNode } from "react";
import { Monitor, ShieldAlert } from "lucide-react";

export const MIN_DESKTOP_WIDTH = 1024;

function matchesDesktopViewport(): boolean {
  return typeof window !== "undefined"
    && window.matchMedia(`(min-width: ${MIN_DESKTOP_WIDTH}px)`).matches;
}

/**
 * Redline est un outil de travail desktop. La connexion reste accessible sur
 * toute largeur, mais le wizard et le dashboard nécessitent un vrai espace de
 * travail pour conserver des panneaux lisibles et manipulables.
 */
export function DesktopViewportGuard({ children }: { children: ReactNode }) {
  const [hasEnoughWidth, setHasEnoughWidth] = useState(matchesDesktopViewport);

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(min-width: ${MIN_DESKTOP_WIDTH}px)`);
    const update = () => setHasEnoughWidth(mediaQuery.matches);

    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return (
    <>
      <div className={hasEnoughWidth ? "contents" : "hidden"} aria-hidden={!hasEnoughWidth}>
        {children}
      </div>

      {!hasEnoughWidth && (
        <main
          className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 py-10"
          style={{ fontFamily: "'Outfit', sans-serif" }}
          aria-labelledby="desktop-required-title"
        >
          <section className="w-full max-w-md text-center">
            <div className="flex items-center justify-center gap-3 mb-8">
              <ShieldAlert className="w-5 h-5 text-primary" aria-hidden="true" />
              <span className="text-base font-medium tracking-widest uppercase">redline</span>
            </div>

            <div className="border border-border rounded bg-card px-6 py-8">
              <Monitor className="w-9 h-9 text-primary mx-auto mb-5" aria-hidden="true" />
              <h1 id="desktop-required-title" className="text-xl font-medium mb-2">
                Espace de travail trop étroit
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Redline est conçu pour analyser du code sur ordinateur. Agrandis la fenêtre
                ou utilise un écran d’au moins {MIN_DESKTOP_WIDTH} px de large pour accéder
                à la configuration et au tableau de bord.
              </p>
              <p className="mt-4 text-xs text-muted-foreground/75">
                Résolution recommandée : 1280 × 720 ou supérieure.
              </p>
            </div>
          </section>
        </main>
      )}
    </>
  );
}
