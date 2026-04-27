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
 * Ask the active service worker registration to check for a new version
 * and, if a new SW is waiting, tell it to activate immediately.
 * Resolves once the new SW has taken control (or after a short timeout).
 */
async function activateLatestServiceWorker(timeoutMs = 4000): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return;
    // Force the browser to fetch sw.js and check for an update.
    await reg.update().catch(() => undefined);

    const waiting = reg.waiting ?? reg.installing;
    if (!waiting) return;

    await new Promise<void>((resolve) => {
      const done = () => resolve();
      const timer = setTimeout(done, timeoutMs);
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        () => { clearTimeout(timer); done(); },
        { once: true },
      );
      try {
        waiting.postMessage({ type: "SKIP_WAITING" });
      } catch {
        clearTimeout(timer);
        done();
      }
    });
  } catch { /* ignore */ }
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

/** Soft reload — used for app_version bumps. Activates a waiting SW first. */
export async function softReload() {
  await activateLatestServiceWorker();
  const url = new URL(window.location.href);
  url.searchParams.set("_swc_v", Date.now().toString(36));
  window.location.replace(url.toString());
}

/**
 * One-time setup: when the active SW is replaced (a new build took over),
 * reload the page so the user sees the new build immediately, instead of
 * having to fully close the PWA.
 */
let controllerChangeBound = false;
export function bindServiceWorkerAutoReload() {
  if (controllerChangeBound) return;
  if (!("serviceWorker" in navigator)) return;
  controllerChangeBound = true;
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloaded) return;
    reloaded = true;
    // Small delay so any in-flight request can settle.
    setTimeout(() => window.location.reload(), 50);
  });
}
