import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import { installChunkErrorRecovery, clearChunkReloadGuard } from "./lib/chunkReload";

// Auto-recover from stale module chunks after a deploy (one-shot reload).
installChunkErrorRecovery();
// Boot succeeded — allow future recovery if another stale chunk appears later.
window.setTimeout(clearChunkReloadGuard, 5000);

const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
const pathname = window.location.pathname.replace(/\.html$/, "");
const isRecoveryLink = hashParams.get("type") === "recovery" && !!hashParams.get("access_token");

const pendingSpaRedirect = sessionStorage.getItem("spa-redirect");

if (pendingSpaRedirect) {
  sessionStorage.removeItem("spa-redirect");

  try {
    const { pathname, search, hash } = JSON.parse(pendingSpaRedirect) as {
      pathname?: string;
      search?: string;
      hash?: string;
    };

    if (pathname) {
      window.history.replaceState({}, "", `${pathname}${search ?? ""}${hash ?? ""}`);
    }
  } catch {
    // Ignore malformed redirect payloads.
  }
} else if (isRecoveryLink && pathname === "/") {
  window.history.replaceState({}, "", `/reset-password${window.location.hash}`);
} else if (pathname === "/auth" && window.location.pathname.endsWith(".html")) {
  window.history.replaceState({}, "", `/auth${window.location.search}${window.location.hash}`);
} else if (pathname === "/reset-password" && window.location.pathname.endsWith(".html")) {
  window.history.replaceState({}, "", `/reset-password${window.location.search}${window.location.hash}`);
}

// Sentry crash reporting — no-op until SENTRY_DSN is set in src/lib/sentry.ts.
// Initialized BEFORE React renders so it captures init errors too.
void import("./lib/sentry").then(({ initializeSentry }) => {
  void initializeSentry();
});

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);

// Native (Capacitor) bootstrap — no-op on web.
// Configures status bar, hides splash, wires deep-link OAuth handler.
void import("./lib/nativeBootstrap").then(({ initializeNativeApp }) => {
  void initializeNativeApp();
});

// Capgo Live Updates (OTA) — no-op on web; dormant on native until configured.
// See src/lib/liveUpdates.ts for activation steps.
void import("./lib/liveUpdates").then(({ initializeLiveUpdates }) => {
  void initializeLiveUpdates();
});

// PWA Service Worker registration — only in production and outside Lovable preview/iframes
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com") ||
  window.location.hostname.includes("lovable.app");

// Capacitor native: WebView runs on capacitor:// or https://localhost — never register the web SW.
const isCapacitorNative = (() => {
  const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
  try {
    return !!w.Capacitor && (typeof w.Capacitor.isNativePlatform === "function" ? w.Capacitor.isNativePlatform() : true);
  } catch {
    return false;
  }
})();

if (isPreviewHost || isInIframe || isCapacitorNative) {
  // Make sure no stale SW interferes with the preview
  navigator.serviceWorker?.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  });
} else if ("serviceWorker" in navigator) {
  // Auto-reload as soon as a new SW takes control — fixes the "PWA stuck on
  // old build until I close the app" problem.
  void import("./lib/cacheControl").then(({ bindServiceWorkerAutoReload }) => {
    bindServiceWorkerAutoReload();
  });
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(async (reg) => {
        // Force an immediate update check on every cold start so a freshly
        // reopened PWA picks up the latest build without needing a 2nd open.
        try { await reg.update(); } catch { /* ignore */ }

        // If a new SW is already waiting at boot (common when user closed and
        // reopened the app), activate it now. The app just started rendering,
        // so the reload is invisible and avoids the "needs another close/open" issue.
        const activateIfWaiting = (worker: ServiceWorker | null) => {
          if (!worker) return;
          try { worker.postMessage({ type: "SKIP_WAITING" }); } catch { /* ignore */ }
        };
        activateIfWaiting(reg.waiting);

        // Also handle the case where a new SW finishes installing right after boot.
        reg.addEventListener("updatefound", () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              activateIfWaiting(reg.waiting ?? installing);
            }
          });
        });

        // Periodically poll for an updated SW (every 5 min) so long-lived
        // sessions also pick up new builds.
        setInterval(() => { reg.update().catch(() => undefined); }, 5 * 60 * 1000);

        // Re-check whenever the app comes back to the foreground.
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") {
            reg.update().catch(() => undefined);
          }
        });
      })
      .catch((err) => console.warn("SW registration failed:", err));
  });
}
