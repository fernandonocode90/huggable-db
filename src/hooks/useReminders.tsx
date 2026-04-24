import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  isPreviewOrIframe,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/pwa";

export interface ReminderState {
  enabled: boolean;
  time: string;
  loading: boolean;
  saving: boolean;
  permission: NotificationPermission | "unsupported";
  isPreview: boolean;
}

export const useReminders = () => {
  const { user } = useAuth();
  const [state, setState] = useState<ReminderState>({
    enabled: false,
    time: "07:00",
    loading: true,
    saving: false,
    permission: "default",
    isPreview: false,
  });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("reminder_enabled, reminder_time")
        .eq("id", user.id)
        .maybeSingle();
      const supported = isPushSupported();
      const inPreview = isPreviewOrIframe();
      setState((s) => ({
        ...s,
        enabled: !!data?.reminder_enabled,
        time: (data?.reminder_time ?? "07:00:00").slice(0, 5),
        loading: false,
        permission: supported ? Notification.permission : "unsupported",
        isPreview: inPreview,
      }));
    })();
  }, [user]);

  const setTime = useCallback((time: string) => {
    setState((s) => ({ ...s, time }));
  }, []);

  const save = useCallback(
    async (next: { enabled: boolean; time: string }): Promise<{ ok: boolean; error?: string }> => {
      if (!user) return { ok: false, error: "Not signed in" };
      setState((s) => ({ ...s, saving: true }));

      const { error } = await supabase
        .from("profiles")
        .update({
          reminder_enabled: next.enabled,
          reminder_time: `${next.time}:00`,
        })
        .eq("id", user.id);

      if (error) {
        setState((s) => ({ ...s, saving: false }));
        return { ok: false, error: error.message };
      }

      let pushError: string | undefined;
      if (next.enabled) {
        try {
          const { data } = await supabase.functions.invoke("get-vapid-public-key");
          const publicKey = (data as { publicKey?: string })?.publicKey ?? "";
          const result = await subscribeToPush(publicKey);
          if (!result.ok) {
            if (result.reason === "denied") pushError = "Notification permission denied.";
            else if (result.reason === "unsupported")
              pushError = "Push isn't supported in this browser/preview. It will work in the installed app.";
            else if (result.reason === "no-vapid") pushError = "Server is missing the VAPID key.";
            else pushError = result.error || "Couldn't subscribe to push.";
          }
        } catch (e) {
          pushError = (e as Error).message;
        }
      } else {
        try { await unsubscribeFromPush(); } catch { /* ignore */ }
      }

      setState((s) => ({
        ...s,
        saving: false,
        enabled: next.enabled,
        time: next.time,
        permission: isPushSupported() ? Notification.permission : "unsupported",
      }));

      return { ok: !pushError, error: pushError };
    },
    [user],
  );

  return { state, setTime, save };
};
