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
  // Never interrupt active audio/video playback.
  await waitUntilSafeToReload();
  const url = new URL(window.location.href);
  url.searchParams.set("_swc_v", Date.now().toString(36));
  window.location.replace(url.toString());
}

/**
 * Resolves once no <audio>/<video> in the document is currently playing,
 * so it's safe to navigate/reload without cutting off the user.
 */
function waitUntilSafeToReload(): Promise<void> {
  return new Promise((resolve) => {
    const isPlaying = () => {
      try {
        const els = document.querySelectorAll("audio, video");
        for (const el of Array.from(els) as Array<HTMLMediaElement>) {
          if (!el.paused && !el.ended && el.currentTime > 0) return true;
        }
      } catch { /* ignore */ }
      return false;
    };
    if (!isPlaying()) return resolve();
    const check = () => {
      if (!isPlaying()) {
        document.removeEventListener("pause", check, true);
        document.removeEventListener("ended", check, true);
        clearInterval(poll);
        resolve();
      }
    };
    document.addEventListener("pause", check, true);
    document.addEventListener("ended", check, true);
    const poll = setInterval(check, 5_000);
  });
}

/**
 * One-time setup: when the active SW is replaced (a new build took over),
 * reload the page so the user sees the new build immediately, instead of
 * having to fully close the PWA.
 */
/**
 * Returns true if any <audio> or <video> in the document is currently playing.
 * We must NEVER reload the page while the user is listening — it kills the
 * playback and ruins the experience (especially on mobile / installed PWAs).
 */
function isMediaPlaying(): boolean {
  try {
    const els = document.querySelectorAll("audio, video");
    for (const el of Array.from(els) as Array<HTMLMediaElement>) {
      if (!el.paused && !el.ended && el.currentTime > 0) return true;
    }
  } catch { /* ignore */ }
  return false;
}

let controllerChangeBound = false;
export function bindServiceWorkerAutoReload() {
  if (controllerChangeBound) return;
  if (!("serviceWorker" in navigator)) return;
  controllerChangeBound = true;
  // On a freshly installed PWA there is no controller yet. The first
  // controllerchange is just the initial SW taking control; reloading there
  // resets transient UI state (for example onboarding goes back to Begin).
  // Only reload when a controller is being replaced by a newer one.
  let hasControlledPage = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hasControlledPage) {
      hasControlledPage = true;
      return;
    }
    if (reloaded) return;
    reloaded = true;

    const reloadNow = () => {
      // Final guard: if media started playing in the gap between scheduling
      // and firing, wait again instead of cutting it off.
      if (isMediaPlaying()) {
        scheduleReload();
        return;
      }
      try { window.location.reload(); } catch { /* ignore */ }
    };

    // Wait for: (a) no media playing, AND (b) tab hidden/backgrounded.
    // Whichever happens last wins. This way the reload is invisible — it
    // never interrupts audio/video playback or active reading.
    const scheduleReload = () => {
      const ready = () =>
        !isMediaPlaying() && document.visibilityState === "hidden";

      if (ready()) {
        setTimeout(reloadNow, 50);
        return;
      }

      const onCheck = () => {
        if (ready()) {
          cleanup();
          reloadNow();
        }
      };
      const cleanup = () => {
        document.removeEventListener("visibilitychange", onCheck);
        document.removeEventListener("pause", onCheck, true);
        document.removeEventListener("ended", onCheck, true);
        clearInterval(poll);
      };
      document.addEventListener("visibilitychange", onCheck);
      // Media events bubble through capture phase from <audio>/<video>.
      document.addEventListener("pause", onCheck, true);
      document.addEventListener("ended", onCheck, true);
      // Safety net: poll every 10s in case events are missed (e.g. element
      // removed from DOM mid-playback).
      const poll = setInterval(onCheck, 10_000);
    };

    scheduleReload();
  });
}
