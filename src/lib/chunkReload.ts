/**
 * Stale chunk detection & auto-recovery.
 *
 * When the app is rebuilt/redeployed, file hashes change. Tabs already open
 * still reference the OLD hashed filenames. As soon as the user navigates to
 * a lazy-loaded route, `import()` fails with "Failed to fetch dynamically
 * imported module" — and the user sees a blank screen.
 *
 * Fix: detect that specific error and reload the page ONCE (guarded via
 * sessionStorage so we never loop). After reload the user gets the new build
 * and continues seamlessly.
 */

const RELOAD_FLAG = "chunk-reload-attempted";

const CHUNK_ERROR_PATTERNS = [
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  /error loading dynamically imported module/i,
  /Loading chunk \d+ failed/i,
  /Loading CSS chunk \d+ failed/i,
];

export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : (error as { message?: string })?.message ?? "";
  if (!message) return false;
  return CHUNK_ERROR_PATTERNS.some((rx) => rx.test(message));
}

/**
 * Attempt a one-shot reload to recover from a stale chunk. Returns true if
 * a reload was triggered (so the caller can short-circuit further handling).
 */
export function tryReloadOnChunkError(error: unknown): boolean {
  if (typeof window === "undefined") return false;
  if (!isChunkLoadError(error)) return false;

  try {
    if (sessionStorage.getItem(RELOAD_FLAG)) {
      // We've already tried once this session — don't loop.
      return false;
    }
    sessionStorage.setItem(RELOAD_FLAG, "1");
  } catch {
    // sessionStorage may be blocked (private mode, etc.) — fall through.
  }

  // Defer slightly so any in-flight error logging finishes first.
  setTimeout(() => {
    window.location.reload();
  }, 50);

  return true;
}

/**
 * Clear the reload guard once the app has successfully booted, so a future
 * stale-chunk situation can recover again.
 */
export function clearChunkReloadGuard(): void {
  try {
    sessionStorage.removeItem(RELOAD_FLAG);
  } catch {
    /* ignore */
  }
}

/**
 * Install global listeners for unhandled errors / promise rejections that
 * look like stale-chunk failures, and recover automatically.
 */
export function installChunkErrorRecovery(): void {
  if (typeof window === "undefined") return;

  window.addEventListener("error", (event) => {
    if (tryReloadOnChunkError(event.error ?? event.message)) {
      event.preventDefault?.();
    }
  });

  window.addEventListener("unhandledrejection", (event) => {
    if (tryReloadOnChunkError(event.reason)) {
      event.preventDefault?.();
    }
  });
}
