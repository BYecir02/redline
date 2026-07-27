// Écran d'authentification (porte d'entrée) : connexion ou création de compte.
// Style aligné sur le wizard de setup. En cas de succès, remonte l'utilisateur
// à App qui bascule ensuite vers la configuration/dashboard.
import { useState } from "react";
import { ShieldAlert, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { login, signup, type AuthUser } from "../../../api/auth";

type Mode = "login" | "signup";

export function AuthScreen({ onAuthed }: { onAuthed: (user: AuthUser) => void }) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignup = mode === "signup";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const user = isSignup
        ? await signup(email.trim(), password)
        : await login(email.trim(), password);
      onAuthed(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode((m) => (m === "login" ? "signup" : "login"));
    setError(null);
  };

  return (
    <div
      className="min-h-screen bg-background flex flex-col items-center justify-center px-6"
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      <div className="flex items-center gap-3 mb-8">
        <ShieldAlert className="w-5 h-5 text-primary" />
        <span className="text-base font-medium tracking-widest uppercase text-foreground">redline</span>
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-medium text-foreground mb-1">
            {isSignup ? "Créer un compte" : "Connexion"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isSignup
              ? "Un espace personnel pour surveiller ton code."
              : "Accède à ton espace de surveillance."}
          </p>
        </div>

        <form onSubmit={submit} className="border border-border rounded bg-card p-5 space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs text-muted-foreground uppercase tracking-widest">E-mail</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              placeholder="toi@exemple.dev"
              className="w-full bg-background border border-border rounded px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 transition-colors"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs text-muted-foreground uppercase tracking-widest">Mot de passe</span>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isSignup ? "new-password" : "current-password"}
                required
                minLength={isSignup ? 8 : undefined}
                placeholder={isSignup ? "8 caractères minimum" : "••••••••"}
                className="w-full bg-background border border-border rounded px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 transition-colors pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </label>

          {error && (
            <div className="text-xs text-[#c0392b] bg-[#c0392b]/10 rounded px-3 py-2.5">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                {isSignup ? "Créer mon compte" : "Se connecter"}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          {isSignup ? "Déjà un compte ?" : "Pas encore de compte ?"}{" "}
          <button onClick={switchMode} className="text-primary hover:opacity-80 transition-opacity">
            {isSignup ? "Se connecter" : "Créer un compte"}
          </button>
        </div>
      </div>
    </div>
  );
}
