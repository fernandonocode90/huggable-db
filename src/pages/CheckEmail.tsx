import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NightBackground } from "@/components/swc/NightBackground";

const CheckEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const email = (location.state as { email?: string } | null)?.email ?? "";

  // If user lands here directly with no email in state, send them back to auth.
  useEffect(() => {
    if (!email) navigate("/auth", { replace: true });
  }, [email, navigate]);

  return (
    <NightBackground>
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
        <div className="glass-card rounded-3xl p-8 text-center animate-fade-up">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-10 w-10 text-primary" strokeWidth={1.5} />
          </div>

          <h1 className="font-display text-3xl text-foreground">Account Created!</h1>
          <p className="mt-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Verify your email
          </p>

          <p className="mt-6 text-sm leading-relaxed text-foreground/90">
            Please check your inbox at{" "}
            <span className="font-semibold text-foreground">{email}</span>{" "}
            and click the verification link to activate your account.
          </p>

          <p className="mt-4 text-xs text-muted-foreground">
            Don't see it? Check your spam folder.
          </p>

          <Button
            onClick={() => navigate("/auth", { replace: true })}
            className="mt-8 w-full"
            size="lg"
          >
            Continue
          </Button>
        </div>
      </div>
    </NightBackground>
  );
};

export default CheckEmail;
