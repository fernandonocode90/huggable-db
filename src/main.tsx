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

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);

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
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch((err) => console.warn("SW registration failed:", err));
  });
}
