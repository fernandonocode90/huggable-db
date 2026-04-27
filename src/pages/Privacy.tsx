import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BellRing, KeyRound, Trash2, UserCircle2, CreditCard, AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/swc/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useReminders } from "@/hooks/useReminders";

const Privacy = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [prePromptOpen, setPrePromptOpen] = useState(false);
  const [storeAck, setStoreAck] = useState(false);

  const [subscription, setSubscription] = useState<{
    provider: string | null;
    status: string | null;
    current_period_end: string | null;
  } | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [canceling, setCanceling] = useState(false);

  const { state: reminders, setTime: setReminderTime, save: saveReminders } = useReminders();

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();
      if (data?.display_name) setDisplayName(data.display_name);
    })();
    (async () => {
      const { data } = await supabase
        .from("subscribers")
        .select("provider, status, current_period_end")
        .eq("user_id", user.id)
        .maybeSingle();
      setSubscription(data ?? null);
    })();
  }, [user]);

  const hasActiveSub =
    subscription &&
    (subscription.status === "active" || subscription.status === "trialing") &&
    (!subscription.current_period_end ||
      new Date(subscription.current_period_end) > new Date());

  const isStoreSub =
    subscription?.provider === "apple" || subscription?.provider === "google";

  const cancelMySubscription = async () => {
    setCanceling(true);
    try {
      const { data, error } = await supabase.functions.invoke("cancel-my-subscription");
      if (error) throw error;
      const d = data as { needs_store_cancel?: boolean; provider?: string } | null;
      if (d?.needs_store_cancel) {
        toast({
          title: "Almost done",
          description:
            d.provider === "apple"
              ? "Open Settings → Apple ID → Subscriptions on your iPhone to fully stop billing."
              : "Open Play Store → Profile → Payments & subscriptions to fully stop billing.",
        });
      } else {
        toast({ title: "Subscription canceled", description: "You're now on the free plan." });
      }
      // Refresh
      const { data: fresh } = await supabase
        .from("subscribers")
        .select("provider, status, current_period_end")
        .eq("user_id", user!.id)
        .maybeSingle();
      setSubscription(fresh ?? null);
    } catch (e) {
      toast({
        title: "Couldn't cancel subscription",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setCanceling(false);
      setCancelDialogOpen(false);
    }
  };

  const saveName = async () => {
    if (!user) return;
    if (!displayName.trim()) {
      toast({ title: "Name can't be empty", variant: "destructive" });
      return;
    }
    setSavingName(true);
    const trimmed = displayName.trim();
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: trimmed })
      .eq("id", user.id);
    if (!error) {
      // Keep auth metadata in sync so greetings on other screens update immediately.
      await supabase.auth.updateUser({ data: { full_name: trimmed } }).catch(() => {});
      // Update the cached profile so Profile screen shows the new name without a refetch.
      try {
        const raw = sessionStorage.getItem("swc:profile");
        const parsed = raw ? JSON.parse(raw) : { userId: user.id, avatar_url: null };
        sessionStorage.setItem(
          "swc:profile",
          JSON.stringify({ ...parsed, userId: user.id, display_name: trimmed }),
        );
      } catch { /* ignore */ }
      window.dispatchEvent(new CustomEvent("swc:display-name-updated", { detail: { display_name: trimmed } }));
    }
    setSavingName(false);
    if (error) {
      toast({
        title: "Couldn't update name",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Name updated" });
    }
  };

  const changePassword = async () => {
    if (password.length < 8) {
      toast({
        title: "Password too short",
        description: "Use at least 8 characters.",
        variant: "destructive",
      });
      return;
    }
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        variant: "destructive",
      });
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSavingPassword(false);
    if (error) {
      toast({
        title: "Couldn't update password",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setPassword("");
      setConfirmPassword("");
      toast({ title: "Password updated" });
    }
  };

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("delete-account");
      if (error) throw error;
      toast({ title: "Account deleted" });
      await signOut();
      navigate("/auth");
    } catch (e) {
      toast({
        title: "Couldn't delete account",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDialogOpen(false);
    }
  };

  return (
    <AppShell>
      <header className="animate-fade-up flex items-center justify-between gap-3">
        <button
          onClick={() => navigate("/profile")}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/30 text-foreground transition-colors hover:bg-muted/50"
          aria-label="Back to profile"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
        </button>
        <div className="flex-1 text-center">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
            Account
          </p>
          <h1 className="mt-1 font-display text-2xl">
            <span className="gold-text">Privacy</span>{" "}
            <span className="text-foreground">& Account</span>
          </h1>
        </div>
        <div className="h-10 w-10" />
      </header>

      {/* Display name */}
      <section className="glass-card mt-6 animate-fade-up rounded-3xl p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
            <UserCircle2 className="h-5 w-5 text-primary" strokeWidth={1.6} />
          </div>
          <div>
            <div className="font-display text-base text-foreground">
              Display name
            </div>
            <p className="text-xs text-muted-foreground">
              Shown across the app.
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-end gap-3">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="display-name">Name</Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={60}
            />
          </div>
          <Button onClick={saveName} disabled={savingName}>
            {savingName ? "Saving…" : "Save"}
          </Button>
        </div>
      </section>

      {/* Daily reminder */}
      <section className="glass-card mt-6 animate-fade-up rounded-3xl p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
            <BellRing className="h-5 w-5 text-primary" strokeWidth={1.6} />
          </div>
          <div className="flex-1">
            <div className="font-display text-base text-foreground">
              Daily reminder
            </div>
            <p className="text-xs text-muted-foreground">
              A gentle push to return to your daily teaching.
            </p>
          </div>
          <Switch
            checked={reminders.enabled}
            disabled={reminders.loading || reminders.saving}
            onCheckedChange={async (checked) => {
              // Apple/Google best practice: explain *why* before triggering the
              // native permission prompt. Only show the pre-prompt the first
              // time the user enables reminders and permission isn't decided.
              if (
                checked &&
                !reminders.isPreview &&
                reminders.permission === "default"
              ) {
                setPrePromptOpen(true);
                return;
              }
              const res = await saveReminders({
                enabled: checked,
                time: reminders.time,
              });
              if (res.ok) {
                toast({
                  title: checked ? "Reminders on" : "Reminders off",
                  description: checked
                    ? `We'll nudge you around ${reminders.time}.`
                    : undefined,
                });
              } else {
                toast({
                  title: "Reminder note",
                  description: res.error,
                  variant: "destructive",
                });
              }
            }}
          />
        </div>

        <div className="mt-4 flex items-end gap-3">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="reminder-time">Time</Label>
            <Input
              id="reminder-time"
              type="time"
              value={reminders.time}
              onChange={(e) => setReminderTime(e.target.value)}
              disabled={!reminders.enabled || reminders.saving}
            />
          </div>
          <Button
            variant="outline"
            disabled={!reminders.enabled || reminders.saving}
            onClick={async () => {
              const res = await saveReminders({
                enabled: true,
                time: reminders.time,
              });
              if (res.ok) {
                toast({ title: "Time updated" });
              } else {
                toast({
                  title: "Reminder note",
                  description: res.error,
                  variant: "destructive",
                });
              }
            }}
          >
            {reminders.saving ? "Saving…" : "Save"}
          </Button>
        </div>

        {reminders.isPreview && (
          <p className="mt-3 text-[11px] text-muted-foreground">
            Push notifications only fire in the installed/published app, not
            inside this preview.
          </p>
        )}
        {!reminders.isPreview && reminders.permission === "denied" && (
          <p className="mt-3 text-[11px] text-destructive">
            Notifications are blocked in your browser settings. Re-enable them
            to receive reminders.
          </p>
        )}
      </section>

      {/* Pre-prompt: explain *before* the native permission dialog */}
      <Dialog open={prePromptOpen} onOpenChange={setPrePromptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BellRing className="h-5 w-5 text-primary" />
              Stay on your daily journey
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-2">
              <span className="block">
                Solomon Wealth Code can send you a single, gentle reminder
                each day at the time you choose — so you never miss your
                teaching, scripture and prayer.
              </span>
              <span className="block">
                We never send marketing, ads or anything else. You can turn
                this off here at any time.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setPrePromptOpen(false)}
              disabled={reminders.saving}
            >
              Not now
            </Button>
            <Button
              onClick={async () => {
                setPrePromptOpen(false);
                const res = await saveReminders({
                  enabled: true,
                  time: reminders.time,
                });
                if (res.ok) {
                  toast({
                    title: "Reminders on",
                    description: `We'll nudge you around ${reminders.time}.`,
                  });
                } else {
                  toast({
                    title: "Reminder note",
                    description: res.error,
                    variant: "destructive",
                  });
                }
              }}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password */}
      <section className="glass-card mt-6 animate-fade-up rounded-3xl p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
            <KeyRound className="h-5 w-5 text-primary" strokeWidth={1.6} />
          </div>
          <div>
            <div className="font-display text-base text-foreground">
              Change password
            </div>
            <p className="text-xs text-muted-foreground">
              Use at least 8 characters.
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={changePassword} disabled={savingPassword}>
            {savingPassword ? "Updating…" : "Update password"}
          </Button>
        </div>
      </section>

      {/* Subscription */}
      {hasActiveSub && (
        <section className="mt-6 animate-fade-up rounded-3xl border border-border/40 bg-card/40 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
              <CreditCard className="h-5 w-5 text-primary" strokeWidth={1.6} />
            </div>
            <div>
              <div className="font-display text-base text-foreground">
                Subscription
              </div>
              <p className="text-xs text-muted-foreground">
                {subscription?.provider === "stripe" && "Billed via Stripe."}
                {subscription?.provider === "apple" && "Billed via Apple."}
                {subscription?.provider === "google" && "Billed via Google Play."}
                {subscription?.provider === "manual" && "Granted manually."}
                {" "}You can cancel and keep using the free version.
              </p>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">Cancel subscription</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cancel your subscription?</DialogTitle>
                  <DialogDescription>
                    Your account will stay active on the free plan. You can
                    re-subscribe anytime.
                  </DialogDescription>
                </DialogHeader>
                {isStoreSub && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200">
                    <div className="mb-1 flex items-center gap-2 font-medium">
                      <AlertTriangle className="h-4 w-4" />
                      Action required on your device
                    </div>
                    {subscription?.provider === "apple"
                      ? "Apple subscriptions can only be canceled in iPhone Settings → Apple ID → Subscriptions. We'll mark it canceled here, but you must also cancel in Settings to stop billing."
                      : "Google Play subscriptions can only be canceled in Play Store → Profile → Payments & subscriptions. We'll mark it canceled here, but you must also cancel in Play Store to stop billing."}
                  </div>
                )}
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setCancelDialogOpen(false)}
                    disabled={canceling}
                  >
                    Keep subscription
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={cancelMySubscription}
                    disabled={canceling}
                  >
                    {canceling ? "Canceling…" : "Cancel subscription"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </section>
      )}

      {/* Delete account */}
      <section className="mt-6 animate-fade-up rounded-3xl border border-destructive/30 bg-destructive/5 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/15">
            <Trash2 className="h-5 w-5 text-destructive" strokeWidth={1.6} />
          </div>
          <div>
            <div className="font-display text-base text-foreground">
              Delete account
            </div>
            <p className="text-xs text-muted-foreground">
              Permanently remove your profile, progress and avatar. This cannot
              be undone.
            </p>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Dialog
            open={dialogOpen}
            onOpenChange={(o) => {
              setDialogOpen(o);
              if (!o) setStoreAck(false);
            }}
          >
            <DialogTrigger asChild>
              <Button variant="destructive">Delete my account</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Are you sure?</DialogTitle>
                <DialogDescription>
                  This permanently deletes your account, all your progress and
                  your avatar. To confirm, type <strong>DELETE</strong> below.
                </DialogDescription>
              </DialogHeader>

              {hasActiveSub && subscription?.provider === "stripe" && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs text-foreground/80">
                  Your Stripe subscription will be canceled automatically.
                </div>
              )}

              {hasActiveSub && isStoreSub && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100">
                  <div className="mb-1 flex items-center gap-2 font-medium">
                    <AlertTriangle className="h-4 w-4" />
                    You must cancel your subscription manually
                  </div>
                  <p className="mb-2">
                    {subscription?.provider === "apple"
                      ? "Deleting your account does NOT cancel your Apple subscription. You'll keep being charged unless you cancel it in iPhone Settings → Apple ID → Subscriptions."
                      : "Deleting your account does NOT cancel your Google Play subscription. You'll keep being charged unless you cancel it in Play Store → Profile → Payments & subscriptions."}
                  </p>
                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={storeAck}
                      onChange={(e) => setStoreAck(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span>
                      I understand and will cancel my subscription in{" "}
                      {subscription?.provider === "apple" ? "iPhone Settings" : "Play Store"}.
                    </span>
                  </label>
                </div>
              )}

              <Input
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="DELETE"
                autoFocus
              />
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={
                    deleteConfirm !== "DELETE" ||
                    deleting ||
                    (hasActiveSub && isStoreSub && !storeAck)
                  }
                  onClick={deleteAccount}
                >
                  {deleting ? "Deleting…" : "Delete forever"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </section>

      <p className="mt-6 text-center text-[11px] text-muted-foreground">
        Signed in as {user?.email}
      </p>
    </AppShell>
  );
};

export default Privacy;