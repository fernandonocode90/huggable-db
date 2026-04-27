/**
 * Push permission priming.
 *
 * iOS/Android only allow you to ask for push permission ONCE — if the user
 * denies, you can't ask again (only deeplink to Settings). So instead of
 * triggering the native prompt cold, we show our own bottom sheet first to
 * explain the value. Industry data: ~30% accept cold prompt, ~80% accept
 * after a good prime.
 *
 * Web: this component renders nothing — web push is handled differently and
 * we don't currently use it.
 *
 * USAGE
 * -----
 *   <PushPermissionPrime
 *     trigger="onboarding-finished"
 *     onResult={(granted) => log(granted)}
 *   />
 *
 * The component remembers (in localStorage) whether the user already saw it,
 * so it never shows twice. Reset by clearing the `pushPrime:<trigger>` key.
 */
import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { isNative } from "@/lib/platform";

interface Props {
  /** Unique key — different triggers can prime independently. */
  trigger: string;
  /** Optional: called with the user's choice (true = granted). */
  onResult?: (granted: boolean) => void;
  /** Show after this many ms once mounted. Default 800ms. */
  delayMs?: number;
}

const STORAGE_PREFIX = "pushPrime:";

const hasSeenPrime = (trigger: string): boolean => {
  try {
    return !!window.localStorage.getItem(STORAGE_PREFIX + trigger);
  } catch {
    return false;
  }
};

const markSeen = (trigger: string) => {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + trigger, String(Date.now()));
  } catch {
    /* ignore */
  }
};

export const PushPermissionPrime = ({ trigger, onResult, delayMs = 800 }: Props) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isNative()) return;
    if (hasSeenPrime(trigger)) return;
    const t = window.setTimeout(() => setOpen(true), delayMs);
    return () => window.clearTimeout(t);
  }, [trigger, delayMs]);

  const handleEnable = async () => {
    markSeen(trigger);
    setOpen(false);
    try {
      const { PushNotifications } = await import("@capacitor/push-notifications");
      const result = await PushNotifications.requestPermissions();
      const granted = result.receive === "granted";
      if (granted) {
        await PushNotifications.register();
      }
      onResult?.(granted);
    } catch (err) {
      console.warn("[push-prime] permission flow failed:", err);
      onResult?.(false);
    }
  };

  const handleDismiss = () => {
    markSeen(trigger);
    setOpen(false);
    onResult?.(false);
  };

  if (!isNative()) return null;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleDismiss()}>
      <SheetContent side="bottom" className="rounded-t-3xl border-t border-border/40 bg-background pb-8">
        <SheetHeader className="text-left">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400">
            <Bell className="h-7 w-7" strokeWidth={1.5} />
          </div>
          <SheetTitle className="text-center text-xl">Stay on the path</SheetTitle>
          <SheetDescription className="text-center">
            Get a gentle reminder each day for your audio teaching, scripture, and prayer —
            so the practice becomes effortless.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-3">
          <Button onClick={handleEnable} className="w-full" size="lg">
            <Bell className="mr-2 h-4 w-4" />
            Enable daily reminders
          </Button>
          <Button onClick={handleDismiss} variant="ghost" className="w-full" size="sm">
            <X className="mr-2 h-3 w-3" />
            Not now
          </Button>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          You can change this anytime in Settings.
        </p>
      </SheetContent>
    </Sheet>
  );
};
