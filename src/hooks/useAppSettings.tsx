import { createContext, ReactNode, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

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
}

const DEFAULT: AppSettings = {
  maintenance: { enabled: false, message: "" },
  global_banner: { enabled: false, message: "", variant: "info" },
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

  const refresh = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc("get_public_app_settings");
      if (error) throw error;
      if (data && typeof data === "object") {
        setSettings({ ...DEFAULT, ...(data as Partial<AppSettings>) });
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
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <AppSettingsContext.Provider value={{ settings, loading, refresh }}>
      {children}
    </AppSettingsContext.Provider>
  );
};

export const useAppSettings = () => useContext(AppSettingsContext);
