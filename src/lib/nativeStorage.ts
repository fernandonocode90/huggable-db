/**
 * Storage adapter compatible with web AND Capacitor native (iOS/Android).
 *
 * On web → uses `localStorage` (synchronous under the hood, wrapped in a
 * Promise-compatible interface so the API is uniform).
 *
 * On native → uses `@capacitor/preferences`, which is the proper native
 * key/value store on iOS and Android. Keeps Supabase auth tokens persistent
 * across app restarts even when the WebView clears localStorage (which iOS
 * does aggressively when storage pressure is high).
 *
 * The Supabase client (`src/integrations/supabase/client.ts`) uses this
 * adapter via `auth.storage`. Because Supabase supports async storage, the
 * native branch works transparently.
 */
import { Preferences } from "@capacitor/preferences";
import { isNative } from "@/lib/platform";

type SupabaseStorageLike = {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string) => void | Promise<void>;
  removeItem: (key: string) => void | Promise<void>;
};

const webStorage: SupabaseStorageLike = {
  getItem: (key) => {
    try {
      return typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      if (typeof window !== "undefined") window.localStorage.setItem(key, value);
    } catch {
      /* quota / private mode — ignore */
    }
  },
  removeItem: (key) => {
    try {
      if (typeof window !== "undefined") window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

const nativeStorage: SupabaseStorageLike = {
  getItem: async (key) => {
    try {
      const { value } = await Preferences.get({ key });
      return value ?? null;
    } catch {
      return null;
    }
  },
  setItem: async (key, value) => {
    try {
      await Preferences.set({ key, value });
    } catch {
      /* ignore */
    }
  },
  removeItem: async (key) => {
    try {
      await Preferences.remove({ key });
    } catch {
      /* ignore */
    }
  },
};

export const authStorage: SupabaseStorageLike = isNative() ? nativeStorage : webStorage;

// Re-export for backward compatibility (existing imports use this name).
export const isNativePlatform = isNative;
