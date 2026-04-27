import { useEffect, useState } from "react";

/**
 * Splash Preview — DEV-only visual simulator.
 *
 * Renders the native splash screen exactly as it will appear on a real device
 * after a successful Capacitor build:
 *   - Solid #0a0a0f background (matches capacitor.config.ts)
 *   - Crown icon centered (sourced from resources/splash.png → public/splash-preview.png)
 *   - 1200ms display, then 300ms fade-out (matches launchShowDuration)
 *   - Mobile device frame (iPhone 14-ish proportions) with simulated status bar
 *
 * Open at: /splash-preview
 *
 * Press the "Replay" button to see the animation again.
 */

type DeviceKind = "iphone" | "android";

const DEVICES: Record<DeviceKind, { label: string; width: number; height: number; radius: number; notch: boolean }> = {
  iphone: { label: "iPhone 14 Pro", width: 320, height: 692, radius: 48, notch: true },
  android: { label: "Android (Pixel)", width: 320, height: 692, radius: 32, notch: false },
};

const SplashPreview = () => {
  const [device, setDevice] = useState<DeviceKind>("iphone");
  const [phase, setPhase] = useState<"visible" | "fading" | "gone">("visible");
  const [runId, setRunId] = useState(0);

  // Match capacitor.config.ts: launchShowDuration: 1200, then ~300ms fade.
  useEffect(() => {
    setPhase("visible");
    const t1 = window.setTimeout(() => setPhase("fading"), 1200);
    const t2 = window.setTimeout(() => setPhase("gone"), 1500);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [runId]);

  const dev = DEVICES[device];

  return (
    <div className="min-h-screen w-full bg-neutral-900 text-neutral-100 flex flex-col items-center justify-center gap-6 p-6">
      <header className="text-center max-w-md">
        <h1 className="text-2xl font-semibold mb-1">Native Splash Preview</h1>
        <p className="text-sm text-neutral-400">
          This is exactly how the splash will appear on a real iOS/Android device after build.
          Background <code className="text-amber-300">#0a0a0f</code>, 1.2s display + fade-out.
        </p>
      </header>

      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap justify-center">
        {(Object.keys(DEVICES) as DeviceKind[]).map((d) => (
          <button
            key={d}
            onClick={() => setDevice(d)}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
              device === d
                ? "bg-amber-500 text-black font-medium"
                : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
            }`}
          >
            {DEVICES[d].label}
          </button>
        ))}
        <button
          onClick={() => setRunId((n) => n + 1)}
          className="px-3 py-1.5 rounded-md text-sm bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-colors"
        >
          ↻ Replay
        </button>
      </div>

      {/* Device frame */}
      <div
        className="relative bg-black shadow-2xl overflow-hidden"
        style={{
          width: dev.width,
          height: dev.height,
          borderRadius: dev.radius,
          padding: 6,
          boxShadow: "0 0 0 2px #2a2a2a, 0 30px 60px rgba(0,0,0,0.6)",
        }}
      >
        {/* Inner screen */}
        <div
          className="relative w-full h-full overflow-hidden bg-[#0a0a0f]"
          style={{ borderRadius: dev.radius - 6 }}
        >
          {/* Simulated status bar (always visible — splash sits underneath) */}
          <div className="absolute top-0 inset-x-0 h-7 z-10 flex items-center justify-between px-5 text-[11px] text-white/80 font-medium">
            <span>9:41</span>
            <div className="flex items-center gap-1">
              <span>●●●●</span>
              <span>WiFi</span>
              <span>100%</span>
            </div>
          </div>

          {/* iPhone notch / dynamic island */}
          {dev.notch && (
            <div
              className="absolute top-2 left-1/2 -translate-x-1/2 h-6 w-24 bg-black rounded-full z-20"
              aria-hidden
            />
          )}

          {/* The actual splash — fades out after 1.2s */}
          <div
            className="absolute inset-0 bg-[#0a0a0f] flex items-center justify-center"
            style={{
              opacity: phase === "gone" ? 0 : phase === "fading" ? 0 : 1,
              transition: phase === "fading" ? "opacity 300ms ease-out" : "none",
              pointerEvents: "none",
            }}
          >
            <img
              src="/splash-preview.png"
              alt="Splash"
              className="w-full h-full object-cover"
              draggable={false}
            />
          </div>

          {/* Behind the splash: pretend "app loaded" state, so when the splash
              fades you see a hint of the real app — just like in production. */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-500 text-xs">
            <div className="opacity-40">app loaded</div>
            <div className="opacity-30 mt-1">(splash dismissed)</div>
          </div>
        </div>
      </div>

      {/* Info panel */}
      <div className="text-xs text-neutral-500 text-center max-w-md space-y-1">
        <div>
          Source: <code className="text-neutral-400">resources/splash.png</code> →
          {" "}
          <code className="text-neutral-400">public/splash-preview.png</code>
        </div>
        <div>
          Config: <code className="text-neutral-400">capacitor.config.ts → SplashScreen</code>
          {" "}
          (1200ms, autoHide, #0a0a0f)
        </div>
        <div className="pt-2 text-neutral-600">
          Note: real native splash uses platform-generated assets in
          {" "}
          <code>ios/.../Assets.xcassets</code> and{" "}
          <code>android/.../res/drawable-*</code>, generated from the same source by{" "}
          <code>npx @capacitor/assets generate</code>.
        </div>
      </div>
    </div>
  );
};

export default SplashPreview;
