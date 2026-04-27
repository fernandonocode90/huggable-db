/**
 * Native-only bootstrap. Called once from `main.tsx`.
 *
 * Everything inside this file is gated behind `isNative()` so it's a no-op
 * on the web. Safe to call unconditionally.
 *
 * Responsibilities (only on iOS/Android):
 *   1. Configure the status bar (dark style over our night background).
 *   2. Hide the splash screen as soon as React is mounted.
 *   3. Listen for deep links (`appUrlOpen`) and finish the OAuth flow when
 *      the user is redirected back to the app via a custom URL scheme.
 *
 * NEVER import this from web-only paths in a way that loads it eagerly on
 * the browser — it's already designed to be a no-op there, but keeping the
 * call site centralized in `main.tsx` makes the contract obvious.
 */
import { isNative } from "@/lib/platform";

export const initializeNativeApp = async (): Promise<void> => {
  if (!isNative()) return;

  try {
    // Lazy-import so web bundles don't pay the cost.
    const [{ StatusBar, Style }, { SplashScreen }, { App }] = await Promise.all([
      import("@capacitor/status-bar"),
      import("@capacitor/splash-screen"),
      import("@capacitor/app"),
    ]);

    // Status bar: dark UI on dark background.
    try {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: "#0a0a0f" });
    } catch (err) {
      console.warn("[native] StatusBar setup failed:", err);
    }

    // Hide splash as soon as React has rendered (we let it linger for
    // ~300ms to avoid a hard flash).
    setTimeout(() => {
      SplashScreen.hide().catch((err) => {
        console.warn("[native] SplashScreen.hide failed:", err);
      });
    }, 300);

    // Deep link handler — finishes Supabase OAuth on native.
    // The app is registered for the custom scheme defined in capacitor.config.ts
    // (appId-based URL like app.lovable.<id>://oauth-callback).
    App.addListener("appUrlOpen", async (event) => {
      try {
        const url = event.url;
        if (!url) return;

        // Supabase appends the auth fragment (#access_token=...) to the
        // redirect URL. We strip the scheme/host and feed the hash to Supabase.
        const hashIndex = url.indexOf("#");
        if (hashIndex === -1) return;

        const hash = url.slice(hashIndex + 1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        if (!accessToken || !refreshToken) return;

        const { supabase } = await import("@/integrations/supabase/client");
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
      } catch (err) {
        console.error("[native] appUrlOpen handler failed:", err);
      }
    });
  } catch (err) {
    console.error("[native] Bootstrap failed:", err);
  }
};
