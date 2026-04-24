import { useEffect, useRef, useState } from "react";
import { ChevronRight, Camera, Flame, LogOut, ShieldCheck, Shield, Loader2, Sun, Moon, History, Mail, FileText } from "lucide-react";
import { AppShell } from "@/components/swc/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { useProgress } from "@/hooks/useProgress";
import { useTheme } from "@/hooks/useTheme";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const Profile = () => {
  const { user, isAdmin, signOut } = useAuth();
  const { currentDay, streak, completedCount } = useProgress();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Hydrate from sessionStorage so revisits are instant — no flash of initials.
  const PROFILE_CACHE_KEY = "swc:profile";
  const cached = (() => {
    try {
      const raw = sessionStorage.getItem(PROFILE_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { userId: string; avatar_url: string | null; display_name: string | null };
      if (user && parsed.userId !== user.id) return null;
      return parsed;
    } catch { return null; }
  })();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(cached?.avatar_url ?? null);
  const [displayName, setDisplayName] = useState<string | null>(cached?.display_name ?? null);
  const [uploading, setUploading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(!cached);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("avatar_url, display_name")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        setAvatarUrl(data.avatar_url);
        setDisplayName(data.display_name);
        try {
          sessionStorage.setItem(
            PROFILE_CACHE_KEY,
            JSON.stringify({ userId: user.id, avatar_url: data.avatar_url, display_name: data.display_name }),
          );
        } catch { /* ignore */ }
      }
      setProfileLoading(false);
    })();
  }, [user]);

  const nameForInitials =
    displayName || user?.user_metadata?.full_name || user?.email || "SW";
  const initials = String(nameForInitials)
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleAvatarPick = () => fileInputRef.current?.click();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please choose an image file", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum size is 2 MB.",
        variant: "destructive",
      });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: pub } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);
      const publicUrl = `${pub.publicUrl}?t=${Date.now()}`;
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);
      if (updateError) throw updateError;
      setAvatarUrl(publicUrl);
      toast({ title: "Avatar updated" });
    } catch (err) {
      toast({
        title: "Upload failed",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <AppShell>
      <header className="animate-fade-up text-center">
        <button
          onClick={handleAvatarPick}
          disabled={uploading}
          className="group relative mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-primary/15 ring-2 ring-primary/40 shadow-[0_0_30px_hsl(var(--primary)/0.35)] transition-transform hover:scale-105 disabled:cursor-wait"
          aria-label="Change profile picture"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profile picture"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="font-display text-3xl gold-text">{initials}</span>
          )}
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/60 opacity-0 transition-opacity group-hover:opacity-100">
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-foreground" />
            ) : (
              <Camera className="h-6 w-6 text-foreground" strokeWidth={1.6} />
            )}
          </span>
          {uploading && !avatarUrl && (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/60">
              <Loader2 className="h-6 w-6 animate-spin text-foreground" />
            </span>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
        />
        <h1 className="mt-4 font-display text-3xl text-foreground">
          {profileLoading && !displayName ? (
            <Skeleton className="mx-auto h-8 w-40" />
          ) : (
            displayName || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Member"
          )}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {user?.email}
        </p>
      </header>

      <div
        className="glass-card mt-8 grid grid-cols-3 gap-2 rounded-3xl p-5 text-center animate-fade-up"
        style={{ animationDelay: "100ms" }}
      >
        {[
          { label: "Day", value: String(currentDay) },
          { label: "Streak", value: String(streak) },
          { label: "Done", value: String(completedCount) },
        ].map((s) => (
          <div key={s.label}>
            <div className="font-display text-2xl gold-text">{s.value}</div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <ul className="mt-6 space-y-3 animate-fade-up" style={{ animationDelay: "180ms" }}>
        {([
          ...(isAdmin ? [{ icon: Shield, label: "Admin Sanctuary", note: "Manage audios", onClick: () => navigate("/admin") }] : []),
          { icon: Flame, label: "Streak & Activity", note: "Track your practice", onClick: () => navigate("/profile/streak") },
          { icon: History, label: "Audio History", note: "Browse past audios by month", onClick: () => navigate("/audio/history") },
          { icon: ShieldCheck, label: "Privacy & Account", note: "Name, password, account", onClick: () => navigate("/profile/privacy") },
          { icon: FileText, label: "Privacy Policy", note: "How we handle your data", onClick: () => navigate("/privacy-policy") },
          { icon: FileText, label: "Terms of Service", note: "The rules of this sanctuary", onClick: () => navigate("/terms") },
          {
            icon: Mail,
            label: "Contact Support",
            note: "Questions, feedback or bug reports",
            onClick: () => {
              window.location.href =
                "mailto:support@solomonwealthcode.com?subject=Solomon%20Wealth%20Code%20Support";
            },
          },
        ] as Array<{icon: typeof Shield; label: string; note: string; onClick?: () => void}>).map((item) => (
          <li key={item.label}>
            <button onClick={item.onClick} className="glass-card flex w-full items-center gap-4 rounded-2xl px-5 py-4 text-left transition-transform hover:scale-[1.02]">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
                <item.icon className="h-5 w-5 text-primary" strokeWidth={1.6} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-foreground">
                  {item.label}
                </div>
                <div className="text-xs text-muted-foreground">{item.note}</div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </li>
        ))}
      </ul>

      <div
        className="glass-card mt-6 rounded-2xl p-4 animate-fade-up"
        style={{ animationDelay: "220ms" }}
      >
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-foreground">Appearance</div>
            <div className="text-xs text-muted-foreground">Choose your background mood</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setTheme("night")}
            aria-pressed={theme === "night"}
            className={`flex flex-col items-center gap-2 rounded-xl border-2 px-3 py-4 transition-all ${
              theme === "night"
                ? "border-primary bg-primary/15 shadow-[0_0_20px_hsl(var(--primary)/0.35)]"
                : "border-border bg-background/30 hover:border-primary/50"
            }`}
          >
            <Moon
              className={`h-6 w-6 ${theme === "night" ? "text-primary" : "text-muted-foreground"}`}
              strokeWidth={1.8}
            />
            <span className={`text-sm font-medium ${theme === "night" ? "text-foreground" : "text-muted-foreground"}`}>
              Night mode
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTheme("day")}
            aria-pressed={theme === "day"}
            className={`flex flex-col items-center gap-2 rounded-xl border-2 px-3 py-4 transition-all ${
              theme === "day"
                ? "border-primary bg-primary/15 shadow-[0_0_20px_hsl(var(--primary)/0.35)]"
                : "border-border bg-background/30 hover:border-primary/50"
            }`}
          >
            <Sun
              className={`h-6 w-6 ${theme === "day" ? "text-primary" : "text-muted-foreground"}`}
              strokeWidth={1.8}
            />
            <span className={`text-sm font-medium ${theme === "day" ? "text-foreground" : "text-muted-foreground"}`}>
              Day mode
            </span>
          </button>
        </div>
      </div>

      <button
        onClick={async () => { await signOut(); navigate("/auth"); }}
        className="glass-card mt-6 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-medium text-foreground/80 transition-colors hover:text-destructive animate-fade-up"
        style={{ animationDelay: "260ms" }}
      >
        <LogOut className="h-4 w-4" />
        Sign Out
      </button>
    </AppShell>
  );
};

export default Profile;
