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

export const getPlatform = (): Platform => {
  const cap = getCap();
  if (!cap) return "web";
  try {
    const p = typeof cap.getPlatform === "function" ? cap.getPlatform() : "web";
    return p === "ios" || p === "android" ? p : "web";
  } catch {
    return "web";
  }
};

export const isIOS = (): boolean => getPlatform() === "ios";
export const isAndroid = (): boolean => getPlatform() === "android";
export const isWeb = (): boolean => getPlatform() === "web";
