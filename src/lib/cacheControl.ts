// Helpers to react to admin-triggered cache invalidation.
// Two mechanisms (see admin Settings):
// 1. app_version bump   -> silent reload to pick up new build
// 2. force_clear_cache  -> wipe SW + Cache Storage + sessionStorage, then reload

const VERSION_KEY = "swc:app_version_seen";
const FORCE_KEY = "swc:force_clear_cache_seen";

export function getSeenAppVersion(): string | null {
  try { return localStorage.getItem(VERSION_KEY); } catch { return null; }
}
export function setSeenAppVersion(v: string) {
  try { localStorage.setItem(VERSION_KEY, v); } catch { /* ignore */ }
}
export function getSeenForceClearAt(): string | null {
  try { return localStorage.getItem(FORCE_KEY); } catch { return null; }
}
export function setSeenForceClearAt(v: string) {
  try { localStorage.setItem(FORCE_KEY, v); } catch { /* ignore */ }
}

/**
 * Wipe everything we reasonably can on the client, then hard reload.
 * Preserves the auth session (Supabase keeps it under its own storage which
 * we deliberately do NOT clear, so the user stays logged in).
 */
export async function fullCacheWipeAndReload() {
  // Service worker
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister().catch(() => false)));
    }
  } catch { /* ignore */ }

  // Cache Storage (anything cached by SW / fetch)
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k).catch(() => false)));
    }
  } catch { /* ignore */ }

  // App-level session caches (we keep localStorage so auth + the "seen" markers survive)
  try { sessionStorage.clear(); } catch { /* ignore */ }

  // Bypass HTTP cache on the next load
  const url = new URL(window.location.href);
  url.searchParams.set("_swc_cb", Date.now().toString(36));
  window.location.replace(url.toString());
}

/** Soft reload — used for app_version bumps. */
export function softReload() {
  const url = new URL(window.location.href);
  url.searchParams.set("_swc_v", Date.now().toString(36));
  window.location.replace(url.toString());
}
