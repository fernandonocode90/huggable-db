import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NightBackground } from "@/components/swc/NightBackground";
import { toast } from "sonner";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Supabase puts a recovery session in the URL hash; the client picks it up automatically.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });

    // If user lands here already in a recovery session, allow update too.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated. You're signed in.");
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error updating password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <NightBackground>
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
        <div className="text-center mb-8 animate-fade-up">
          <h1 className="font-display text-4xl">
            <span className="gold-text">Solomon</span>{" "}
            <span className="text-foreground">Wealth Code</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Set a new password</p>
        </div>

        <form onSubmit={submit} className="glass-card rounded-3xl p-6 space-y-4 animate-fade-up">
          {!ready ? (
            <p className="text-center text-sm text-muted-foreground">
              Verifying your reset link…
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm new password</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" disabled={busy} className="w-full">
                {busy ? "Updating…" : "Update password"}
              </Button>
              <button
                type="button"
                onClick={() => navigate("/auth")}
                className="block w-full text-center text-sm text-muted-foreground hover:text-primary"
              >
                Back to sign in
              </button>
            </>
          )}
        </form>
      </div>
    </NightBackground>
  );
};

export default ResetPassword;
