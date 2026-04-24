import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BellRing, KeyRound, Trash2, UserCircle2 } from "lucide-react";
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
  }, [user]);

  const saveName = async () => {
    if (!user) return;
    if (!displayName.trim()) {
      toast({ title: "Name can't be empty", variant: "destructive" });
      return;
    }
    setSavingName(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim() })
      .eq("id", user.id);
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
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
                  disabled={deleteConfirm !== "DELETE" || deleting}
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