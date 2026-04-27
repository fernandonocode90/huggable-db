import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor configuration.
 *
 * IMPORTANT — this file is "ready" but inert until you run native builds outside Lovable:
 *   1. Export project to GitHub
 *   2. `npm install`
 *   3. `npx cap add ios` and/or `npx cap add android`
 *   4. `npm run build && npx cap sync`
 *   5. `npx cap run ios` (Mac+Xcode) or `npx cap run android` (Android Studio)
 *
 * The `server.url` enables hot-reload from the Lovable preview while developing
 * native — comment it out before submitting to App Store / Google Play so the
 * production build is fully self-contained.
 *
 * For native asset generation (icon + splash) and OAuth deep links, see
 * NATIVE_SETUP.md in the project root.
 */
const config: CapacitorConfig = {
  appId: "app.lovable.5b8e1afd3df944d686520dc552bb9a80",
  appName: "Solomon Wealth Code",
  webDir: "dist",

  // Hot-reload from Lovable preview during development.
  // ⚠️ REMOVE this `server` block before building for production / store submission.
  server: {
    url: "https://5b8e1afd-3df9-44d6-8652-0dc552bb9a80.lovableproject.com?forceHideBadge=true",
    cleartext: true,
  },

  ios: {
    contentInset: "always",
    backgroundColor: "#0a0a0f",
    // Keep status bar visible (we set its style at runtime via @capacitor/status-bar).
    preferredContentMode: "mobile",
    // Custom URL scheme for OAuth deep-link callbacks.
    // Supabase will redirect back to: app.solomonwealthcode://oauth-callback
    // Must match CFBundleURLSchemes added to Info.plist (see NATIVE_SETUP.md).
    scheme: "app.solomonwealthcode",
  },

  android: {
    backgroundColor: "#0a0a0f",
    allowMixedContent: false,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#0a0a0f",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      // Dark UI everywhere — matches the night background.
      style: "DARK",
      backgroundColor: "#0a0a0f",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    // Capgo Live Updates (OTA) — dormant until you set CAPGO_APP_ID in
    // src/lib/liveUpdates.ts. Defaults below are safe production values.
    CapacitorUpdater: {
      autoUpdate: true,
      // Apply downloaded bundles on next cold start (non-disruptive).
      directUpdate: false,
      // Auto-rollback if the new bundle fails to call notifyAppReady() within 10s.
      appReadyTimeout: 10000,
      // Resets to built-in bundle if too many crashes happen.
      autoDeleteFailed: true,
      autoDeletePrevious: true,
    },
  },
};

export default config;
