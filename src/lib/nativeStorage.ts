/**
 * Storage adapter compatível com web e Capacitor (futuro).
 *
 * Por enquanto roda como `localStorage` em todos os ambientes,
 * mas a interface é assíncrona pra suportar `@capacitor/preferences`
 * sem mudar nada quando convertermos pra app nativo.
 *
 * Quando instalar Capacitor:
 *   1. `npm i @capacitor/preferences`
 *   2. Descomentar o bloco "NATIVE BRANCH" abaixo.
 */

type SupabaseStorageLike = {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string) => void | Promise<void>;
  removeItem: (key: string) => void | Promise<void>;
};

const isNative = (): boolean => {
  // @ts-expect-error - Capacitor injeta isso em runtime nativo.
  return typeof window !== "undefined" && !!window.Capacitor?.isNativePlatform?.();
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

/* ---------- NATIVE BRANCH (descomente após instalar Capacitor Preferences) ----------
import { Preferences } from "@capacitor/preferences";

const nativeStorage: SupabaseStorageLike = {
  getItem: async (key) => (await Preferences.get({ key })).value,
  setItem: async (key, value) => { await Preferences.set({ key, value }); },
  removeItem: async (key) => { await Preferences.remove({ key }); },
};
------------------------------------------------------------------------------------- */

export const authStorage: SupabaseStorageLike = isNative()
  ? webStorage // ← trocar por `nativeStorage` quando ativar Capacitor
  : webStorage;

export const isNativePlatform = isNative;
