import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/**
 * Persistent thin banner shown at the very top of the app whenever the
 * device loses internet connection. Disappears automatically when the
 * connection is restored.
 *
 * Apple/Google reviewers test apps in airplane mode; a clear, non-blocking
 * offline indicator is a strong signal of a polished app.
 */
export const OfflineBanner = () => {
  const [online, setOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-2 bg-destructive px-4 py-2 text-xs font-medium text-destructive-foreground shadow-md"
      style={{
        paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)",
      }}
    >
      <WifiOff className="h-3.5 w-3.5" />
      <span>You're offline. Some features may not work.</span>
    </div>
  );
};
