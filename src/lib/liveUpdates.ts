/**
 * Capgo Live Updates (OTA) — dormant until you build native.
 *
 * WHAT THIS DOES
 * --------------
 * Once your app is published to the App Store / Play Store, you don't want to
 * wait days for Apple's review every time you fix a typo. Capgo lets you push
 * JS/CSS/HTML updates Over-The-Air directly to installed apps — users get the
 * new code on next app open, no store review involved.
 *
 * Native-only changes (new plugins, permissions, icon, splash, Capacitor version
 * bumps) STILL require a normal store re-submission. OTA only covers your web
 * bundle.
 *
 * STATUS
 * ------
 * Plugin is installed and this file is wired into `main.tsx`, but it is a
 * complete no-op until ALL of these are true:
 *   1. App is running natively (iOS or Android — not web/PWA).
 *   2. `CAPGO_APP_ID` below is filled with your real Capgo app id.
 *
 * On web, this file does nothing. On native without a configured app id, it
 * logs a single warning and exits. Zero impact on current users.
 *
 * ACTIVATION CHECKLIST (do this when you're ready to ship native + OTA)
 * --------------------------------------------------------------------
 *   1. Sign up at https://capgo.app (free trial → ~$14/mo Solo plan).
 *   2. Run `npx @capgo/cli init` locally — it creates the Capgo app and prints
 *      your `appId`. Paste it into `CAPGO_APP_ID` below.
 *   3. (Optional) Set `CAPGO_CHANNEL` to "production" / "beta" / etc. if you
 *      use channels.
 *   4. Build & upload your first bundle:
 *        npm run build
 *        npx @capgo/cli bundle upload --channel production
 *   5. From now on, every `bundle upload` reaches devices on next app open.
 *
 * SAFETY
 * ------
 * - Auto-rollback: if the new bundle crashes on boot, Capgo reverts to the
 *   last working version automatically (we call `notifyAppReady()` once React
 *   has mounted — that's the "this bundle works" signal).
 * - Updates are downloaded in background and applied on next cold start
 *   (default behavior — non-disruptive).
 */
import { isNative } from "@/lib/platform";

// ⚠️ PASTE YOUR CAPGO APP ID HERE WHEN YOU SIGN UP.
// Until then, OTA is fully disabled.
const CAPGO_APP_ID = "" as string;

// Channel to subscribe this build to. Match what you pass to `bundle upload`.
const CAPGO_CHANNEL = "production";

export const initializeLiveUpdates = async (): Promise<void> => {
  if (!isNative()) return;

  if (!CAPGO_APP_ID) {
    // Plugin is installed but not configured — silent on prod, warn in dev.
    if (import.meta.env.DEV) {
      console.info(
        "[capgo] Live updates dormant — set CAPGO_APP_ID in src/lib/liveUpdates.ts to enable.",
      );
    }
    return;
  }

  try {
    const { CapacitorUpdater } = await import("@capgo/capacitor-updater");

    // Tell Capgo this bundle booted successfully → cancels any pending rollback.
    // Must be called every cold start, as soon as we know the app is healthy.
    await CapacitorUpdater.notifyAppReady();

    // Set channel (no-op if already on it).
    try {
      await CapacitorUpdater.setChannel({ channel: CAPGO_CHANNEL });
    } catch (err) {
      console.warn("[capgo] setChannel failed:", err);
    }

    // Default behavior already checks for updates in background and applies on
    // next cold start. Nothing else to do here — Capgo handles the lifecycle.
    if (import.meta.env.DEV) {
      console.info(`[capgo] Live updates active on channel "${CAPGO_CHANNEL}".`);
    }
  } catch (err) {
    console.error("[capgo] Initialization failed:", err);
  }
};
