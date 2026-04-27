/**
 * Centralized platform detection helpers.
 *
 * Use these EVERYWHERE instead of duplicating Capacitor checks. They are safe
 * to call on the web — when Capacitor is not loaded (web build), they return
 * `false` / `"web"` and never throw.
 *
 * Why this file exists: we want web behavior to stay 100% identical until the
 * app is actually packaged with Capacitor. Every native-only branch in the
 * codebase MUST be gated behind one of these helpers.
 */

type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => "web" | "ios" | "android";
};

const getCap = (): CapacitorGlobal | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { Capacitor?: CapacitorGlobal };
  return w.Capacitor ?? null;
};

export const isNative = (): boolean => {
  const cap = getCap();
  if (!cap) return false;
  try {
    return typeof cap.isNativePlatform === "function" ? cap.isNativePlatform() : false;
  } catch {
    return false;
  }
};

export type Platform = "web" | "ios" | "android";

/**
 * DEV-ONLY platform override.
 *
 * Lets you simulate `ios` / `android` while running in the browser, so you can
 * visually verify native-only UI changes (e.g. Stripe hidden, "Subscribe on
 * web" notice) without building the native app.
 *
 * Activate from the browser console:
 *   localStorage.setItem("__forcePlatform", "ios"); location.reload();
 *   localStorage.setItem("__forcePlatform", "android"); location.reload();
 *   localStorage.removeItem("__forcePlatform"); location.reload();
 *
 * The override is IGNORED in production builds and IGNORED when actually
 * running natively — it can only ever flip a web preview to look like native.
 */
const getForcedPlatform = (): Platform | null => {
  if (!import.meta.env.DEV) return null;
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem("__forcePlatform");
    return v === "ios" || v === "android" || v === "web" ? v : null;
  } catch {
    return null;
  }
};

export const getPlatform = (): Platform => {
  const cap = getCap();
  if (!cap) return getForcedPlatform() ?? "web";
  try {
    const p = typeof cap.getPlatform === "function" ? cap.getPlatform() : "web";
    if (p === "ios" || p === "android") return p;
    return getForcedPlatform() ?? "web";
  } catch {
    return getForcedPlatform() ?? "web";
  }
};

export const isIOS = (): boolean => getPlatform() === "ios";
export const isAndroid = (): boolean => getPlatform() === "android";
export const isWeb = (): boolean => getPlatform() === "web";

