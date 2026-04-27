import { createContext, ReactNode, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  fullCacheWipeAndReload,
  getSeenAppVersion,
  getSeenForceClearAt,
  setSeenAppVersion,
  setSeenForceClearAt,
  softReload,
} from "@/lib/cacheControl";

export interface MaintenanceSetting {
  enabled: boolean;
  message: string;
}

export interface BannerSetting {
  enabled: boolean;
  message: string;
  variant: "info" | "warning" | "success";
}

interface AppSettings {
  maintenance: MaintenanceSetting;
  global_banner: BannerSetting;
  app_version: string;
  force_clear_cache_at: string;
}

const DEFAULT: AppSettings = {
  maintenance: { enabled: false, message: "" },
  global_banner: { enabled: false, message: "", variant: "info" },
  app_version: "",
  force_clear_cache_at: "",
};

interface Ctx {
  settings: AppSettings;
  loading: boolean;
  refresh: () => Promise<void>;
}

const AppSettingsContext = createContext<Ctx>({
  settings: DEFAULT,
  loading: true,
  refresh: async () => {},
});

export const AppSettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const reloadingRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc("get_public_app_settings");
      if (error) throw error;
      if (data && typeof data === "object") {
        const merged = { ...DEFAULT, ...(data as Partial<AppSettings>) };
        setSettings(merged);

        // Cache-control reactions (skip on first load to avoid reload loop)
        if (reloadingRef.current) return;

        const version = String(merged.app_version ?? "");
        const force = String(merged.force_clear_cache_at ?? "");

        const seenVersion = getSeenAppVersion();
        const seenForce = getSeenForceClearAt();

        // First time we see them: record without acting.
        if (seenVersion === null && version) setSeenAppVersion(version);
        if (seenForce === null && force) setSeenForceClearAt(force);

        // Force-clear takes priority (heavier hammer).
        if (seenForce !== null && force && force !== seenForce) {
          reloadingRef.current = true;
          setSeenForceClearAt(force);
          setSeenAppVersion(version); // also clear version flag
          void fullCacheWipeAndReload();
          return;
        }

        // Silent app version bump.
        if (seenVersion !== null && version && version !== seenVersion) {
          reloadingRef.current = true;
          setSeenAppVersion(version);
          void softReload();
          return;
        }
      }
    } catch {
      // ignore — fall back to defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), 60_000);
    // Also refresh when the tab regains focus — picks up updates faster than the 60s poll.
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  return (
    <AppSettingsContext.Provider value={{ settings, loading, refresh }}>
      {children}
    </AppSettingsContext.Provider>
  );
};

export const useAppSettings = () => useContext(AppSettingsContext);
