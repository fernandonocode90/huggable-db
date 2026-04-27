import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NightBackground } from "@/components/swc/NightBackground";
import crownLogo from "@/assets/golden-crown.webp";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const prefillEmail = (location.state as { email?: string } | null)?.email ?? "";
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState<"google" | "apple" | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);

  // iOS users see Apple first (App Store guideline + native expectation)
  const isIOS = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent || "";
    return /iPad|iPhone|iPod/.test(ua) ||
      (ua.includes("Mac") && "ontouchend" in document);
  }, []);

  useEffect(() => {
    if (!loading && user) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: name, timezone },
          },
        });
        if (error) throw error;
        if (data.session) {
          // Auto-login: confirmação de email desativada — entra direto.
          toast.success("Welcome!");
          // O onAuthStateChange + useEffect cuidam do redirect.
        } else {
          // Confirmação de email ativa — leva pra tela dedicada com aviso claro.
          navigate("/check-email", { state: { email }, replace: true });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          // Email ainda não confirmado → manda pra tela de reenvio com o email preenchido
          const code = (error as { code?: string }).code;
          const msg = error.message?.toLowerCase() ?? "";
          if (code === "email_not_confirmed" || msg.includes("not confirmed")) {
            toast.message("Please confirm your email to continue.");
            navigate("/check-email", { state: { email }, replace: true });
            return;
          }
          throw error;
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setOauthBusy("google");
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/`,
    });
    if (result.error) {
      toast.error(result.error.message);
      setOauthBusy(null);
    }
    // On success the browser navigates away — leave spinner on.
  };

  const apple = async () => {
    setOauthBusy("apple");
    const result = await lovable.auth.signInWithOAuth("apple", {
      redirect_uri: `${window.location.origin}/`,
    });
    if (result.error) {
      toast.error(result.error.message);
      setOauthBusy(null);
    }
  };

  const sendReset = async (e: FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/`,
      });
      if (error) throw error;
      toast.success("Reset link sent. Check your inbox (and your spam folder).");
      setForgotOpen(false);
      setForgotEmail("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setForgotBusy(false);
    }
  };

  return (
    <NightBackground>
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
        <div className="text-center mb-8 animate-fade-up">
          <img
            src={crownLogo}
            alt="Solomon Wealth Code crown"
            className="mx-auto mb-4 h-20 w-20 object-contain"
            draggable={false}
          />
          <h1 className="font-display text-4xl">
            <span className="gold-text">Solomon</span>{" "}
            <span className="text-foreground">Wealth Code</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signin" ? "Welcome back to your sanctuary" : "365 days of biblical wealth wisdom"}
          </p>
        </div>

        <form onSubmit={submit} className="glass-card rounded-3xl p-6 space-y-4 animate-fade-up">
          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "..." : mode === "signin" ? "Sign in" : "Create account"}
          </Button>

          {mode === "signin" && (
            <button
              type="button"
              onClick={() => {
                setForgotEmail(email);
                setForgotOpen(true);
              }}
              className="block w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
            >
              Forgot your password?
            </button>
          )}

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background/50 px-2 text-muted-foreground">or</span>
            </div>
          </div>

          {(() => {
            const googleBtn = (
              <Button key="google" type="button" variant="outline" onClick={google} disabled={!!oauthBusy} className="w-full">
                {oauthBusy === "google" ? (
                  "Connecting…"
                ) : (
                  <>
                    <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden>
                      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
                      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
                      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
                      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
                    </svg>
                    Continue with Google
                  </>
                )}
              </Button>
            );

            const appleBtn = (
              <Button
                key="apple"
                type="button"
                variant="outline"
                onClick={apple}
                disabled={!!oauthBusy}
                className="w-full bg-foreground text-background hover:bg-foreground/90 hover:text-background border-foreground"
              >
                {oauthBusy === "apple" ? (
                  "Connecting…"
                ) : (
                  <>
                    <svg viewBox="0 0 384 512" className="h-4 w-4" fill="currentColor" aria-hidden>
                      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zM256.3 91.6c30.4-36.1 27.6-69 26.7-80.6-26.8 1.6-57.8 18.3-75.5 38.8-19.5 22-30.9 49.2-28.4 79.9 28.9 2.2 55.3-12.6 77.2-38.1z"/>
                    </svg>
                    Continue with Apple
                  </>
                )}
              </Button>
            );

            return isIOS ? [appleBtn, googleBtn] : [googleBtn, appleBtn];
          })()}

          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="block w-full text-center text-sm text-muted-foreground hover:text-primary"
          >
            {mode === "signin" ? "No account? Sign up" : "Have an account? Sign in"}
          </button>

          {mode === "signup" && (
            <p className="text-center text-xs text-muted-foreground leading-relaxed">
              By creating an account you agree to our{" "}
              <a href="/terms" className="text-primary hover:underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="/privacy-policy" className="text-primary hover:underline">
                Privacy Policy
              </a>
              .
            </p>
          )}
        </form>
      </div>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent
          className="top-[max(env(safe-area-inset-top),1rem)] translate-y-0 sm:top-[50%] sm:translate-y-[-50%] max-h-[calc(100dvh-2rem)] overflow-y-auto"
        >
          <DialogHeader>
            <DialogTitle>Reset your password</DialogTitle>
            <DialogDescription>
              Type the email you used to sign up. We'll send a secure link you can tap to choose a new password.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={sendReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Your email</Label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="you@example.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                onFocus={(e) => {
                  // Keep input visible above the on-screen keyboard on mobile
                  setTimeout(() => {
                    e.currentTarget?.scrollIntoView({ block: "center", behavior: "smooth" });
                  }, 300);
                }}
                required
                autoFocus
              />
              <p className="text-xs text-muted-foreground leading-relaxed">
                The email usually arrives within a minute. If you don't see it,
                check your <span className="font-medium text-foreground">Spam</span> or
                <span className="font-medium text-foreground"> Promotions</span> folder.
                The link expires in 1 hour.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setForgotOpen(false)} disabled={forgotBusy}>
                Cancel
              </Button>
              <Button type="submit" disabled={forgotBusy}>
                {forgotBusy ? "Sending…" : "Send reset link"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </NightBackground>
  );
};

export default Auth;