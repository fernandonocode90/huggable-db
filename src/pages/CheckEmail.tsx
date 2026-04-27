import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle2, Mail, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NightBackground } from "@/components/swc/NightBackground";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const RESEND_COOLDOWN_SECONDS = 60;

const CheckEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const email = (location.state as { email?: string } | null)?.email ?? "";
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // If user lands here directly with no email in state, send them back to auth.
  useEffect(() => {
    if (!email) navigate("/auth", { replace: true });
  }, [email, navigate]);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const resend = async () => {
    if (busy || cooldown > 0 || !email) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
      toast.success("Confirmation email sent again. Check your inbox.");
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not resend email");
    } finally {
      setBusy(false);
    }
  };

  return (
    <NightBackground>
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
        <div className="glass-card rounded-3xl p-8 text-center animate-fade-up">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-10 w-10 text-primary" strokeWidth={1.5} />
          </div>

          <h1 className="font-display text-3xl text-foreground">Check your email</h1>
          <p className="mt-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Verify your address to continue
          </p>

          <p className="mt-6 text-sm leading-relaxed text-foreground/90">
            We sent a confirmation link to:
          </p>

          <div className="mt-3 rounded-2xl border border-border bg-background/40 px-4 py-3">
            <p className="break-all font-semibold text-foreground">{email}</p>
          </div>

          <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
            Click the link in that email to activate your account.
            Don't forget to check your spam or promotions folder.
          </p>

          <Button
            onClick={resend}
            disabled={busy || cooldown > 0}
            className="mt-6 w-full"
            size="lg"
          >
            <Mail className="mr-2 h-4 w-4" />
            {busy
              ? "Sending…"
              : cooldown > 0
                ? `Resend in ${cooldown}s`
                : "Resend confirmation email"}
          </Button>

          <button
            type="button"
            onClick={() => navigate("/auth", { replace: true, state: { email } })}
            className="mt-4 inline-flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
          >
            <Pencil className="h-3.5 w-3.5" />
            Wrong email? Edit and try again
          </button>

          <p className="mt-6 text-xs text-muted-foreground">
            Already confirmed?{" "}
            <button
              type="button"
              onClick={() => navigate("/auth", { replace: true, state: { email } })}
              className="text-primary hover:underline"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </NightBackground>
  );
};

export default CheckEmail;
