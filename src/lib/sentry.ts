/**
 * Sentry crash reporting — DORMANT until configured.
 *
 * Wired into main.tsx but does NOTHING until you fill SENTRY_DSN below.
 * On web: uses @sentry/react. On native: uses @sentry/capacitor (which wraps
 * @sentry/react and adds native iOS/Android crash capture).
 *
 * ACTIVATION
 * ----------
 *   1. Sign up at https://sentry.io (free tier: 5k errors/month)
 *   2. Create a project of type "React"
 *   3. Copy the DSN (looks like https://abc123@o123.ingest.sentry.io/456)
 *   4. Paste it into SENTRY_DSN below
 *   5. (Optional, native only) After running `npx cap sync`, also configure
 *      the native SDK in Xcode/Android — see Sentry's Capacitor docs.
 *
 * On native production builds, this also captures unhandled native crashes
 * (Swift/Kotlin) — not just JS errors.
 */
import { isNative } from "@/lib/platform";
import { APP_VERSION, APP_BUILD_DATE } from "@/lib/appVersion";

const SENTRY_DSN = "" as string;

export const initializeSentry = async (): Promise<void> => {
  if (!SENTRY_DSN) {
    if (import.meta.env.DEV) {
      console.info(
        "[sentry] Crash reporting dormant — set SENTRY_DSN in src/lib/sentry.ts to enable.",
      );
    }
    return;
  }

  // Don't ship crash reports from dev or from the Lovable preview iframe.
  if (import.meta.env.DEV) return;
  try {
    if (window.self !== window.top) return;
  } catch {
    return;
  }

  try {
    const release = `solomon-wealth-code@${APP_VERSION}+${APP_BUILD_DATE}`;
    const environment = "production";

    if (isNative()) {
      // Native build → use the Capacitor SDK (wraps React + adds native).
      const Sentry = await import("@sentry/capacitor");
      const SentryReact = await import("@sentry/react");
      Sentry.init(
        {
          dsn: SENTRY_DSN,
          release,
          environment,
          tracesSampleRate: 0.1,
          // Avoid noisy breadcrumb spam.
          attachStacktrace: true,
        },
        SentryReact.init,
      );
    } else {
      // Web/PWA → React SDK is enough.
      const Sentry = await import("@sentry/react");
      Sentry.init({
        dsn: SENTRY_DSN,
        release,
        environment,
        tracesSampleRate: 0.1,
        attachStacktrace: true,
      });
    }
  } catch (err) {
    console.warn("[sentry] Initialization failed:", err);
  }
};
