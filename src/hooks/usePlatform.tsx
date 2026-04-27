import { useEffect, useState } from "react";
import { getPlatform, isNative, type Platform } from "@/lib/platform";

/**
 * React hook wrapper around platform detection. Returns a stable snapshot
 * captured on mount. Useful for conditionally rendering native-only UI
 * (or hiding web-only flows like Stripe checkout on iOS).
 */
export const usePlatform = (): { platform: Platform; native: boolean } => {
  const [state, setState] = useState<{ platform: Platform; native: boolean }>(() => ({
    platform: getPlatform(),
    native: isNative(),
  }));

  // Capacitor injects window.Capacitor synchronously, so this normally never
  // fires — but on a slow native bridge boot we re-check once after mount.
  useEffect(() => {
    const next = { platform: getPlatform(), native: isNative() };
    if (next.platform !== state.platform || next.native !== state.native) {
      setState(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
};
