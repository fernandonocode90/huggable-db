import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NightBackground } from "@/components/swc/NightBackground";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: name, timezone },
          },
        });
        if (error) throw error;
        toast.success("Account created! You can sign in now.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/`,
    });
    if (result.error) toast.error(result.error.message);
  };

  const apple = async () => {
    const result = await lovable.auth.signInWithOAuth("apple", {
      redirect_uri: `${window.location.origin}/`,
    });
    if (result.error) toast.error(result.error.message);
  };

  return (
    <NightBackground>
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
        <div className="text-center mb-8 animate-fade-up">
          <h1 className="font-display text-4xl">
            <span className="gold-text">Solomon</span>{" "}
            <span className="text-foreground">Wealth Code</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signin" ? "Enter the sanctuary" : "Begin your journey"}
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

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background/50 px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <Button type="button" variant="outline" onClick={google} className="w-full">
            Continue with Google
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={apple}
            className="w-full bg-foreground text-background hover:bg-foreground/90 hover:text-background border-foreground"
          >
            <svg viewBox="0 0 384 512" className="h-4 w-4" fill="currentColor" aria-hidden>
              <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zM256.3 91.6c30.4-36.1 27.6-69 26.7-80.6-26.8 1.6-57.8 18.3-75.5 38.8-19.5 22-30.9 49.2-28.4 79.9 28.9 2.2 55.3-12.6 77.2-38.1z"/>
            </svg>
            Continue with Apple
          </Button>

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
              </a>
              .
            </p>
          )}
        </form>
      </div>
    </NightBackground>
  );
};

export default Auth;