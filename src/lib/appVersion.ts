/**
 * App version metadata — single source of truth.
 *
 * Bump APP_VERSION before every store submission. Capacitor's iOS/Android
 * native version (Info.plist `CFBundleShortVersionString` / Android
 * `versionName`) should match this value.
 *
 * BUILD_DATE is set at build time by Vite (define in vite.config.ts) and
 * falls back to a static placeholder during dev.
 */

export const APP_VERSION = "1.0.0";

// Replaced at build time. See vite.config.ts → define.
export const APP_BUILD_DATE: string =
  (typeof __APP_BUILD_DATE__ !== "undefined" && __APP_BUILD_DATE__) || "dev";

export const SUPPORT_EMAIL = "support@solomonwealthcode.com";
export const LANDING_URL = "https://www.solomonwealthcode.com";
