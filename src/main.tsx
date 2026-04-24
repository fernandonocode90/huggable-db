import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";

const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
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
} else if (isRecoveryLink && window.location.pathname === "/") {
  window.history.replaceState({}, "", `/reset-password${window.location.hash}`);
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

if (isPreviewHost || isInIframe) {
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
