/**
 * Open external URLs safely across web AND native.
 *
 * - On web: standard `window.open(url, "_blank")` with proper noopener.
 * - On native (iOS/Android via Capacitor): uses `@capacitor/browser` to open
 *   in an in-app system browser (SFSafariViewController on iOS, Custom Tabs
 *   on Android). This is REQUIRED — a plain anchor with target="_blank"
 *   inside a Capacitor WebView either does nothing or replaces the app.
 *
 * Apple App Store note: opening external HTTP links inside the WebView would
 * break the app navigation and is generally rejected. Always use this helper
 * (or the native plugin) for ANY external URL.
 */
import { Browser } from "@capacitor/browser";
import { isNative } from "@/lib/platform";

export const openExternalUrl = async (url: string): Promise<void> => {
  if (!url) return;

  if (isNative()) {
    try {
      await Browser.open({ url, presentationStyle: "popover" });
      return;
    } catch (err) {
      console.warn("[openExternalUrl] Browser plugin failed, falling back:", err);
    }
  }

  if (typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer");
  }
};
