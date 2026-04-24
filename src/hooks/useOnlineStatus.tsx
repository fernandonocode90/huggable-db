import { useEffect, useState } from "react";
import { toast } from "sonner";

/**
 * Tracks browser online/offline status and surfaces a toast when the user
 * loses or regains connection. Mounted once at the App level.
 */
export const useOnlineStatus = () => {
  const [online, setOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  useEffect(() => {
    let wasOffline = !navigator.onLine;
    const goOnline = () => {
      setOnline(true);
      if (wasOffline) {
        toast.success("Back online", {
          description: "Your connection has been restored.",
        });
        wasOffline = false;
      }
    };
    const goOffline = () => {
      setOnline(false);
      wasOffline = true;
      toast.error("You're offline", {
        description: "Some features won't work until you reconnect.",
        duration: 5000,
      });
    };
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return online;
};

export const OnlineStatusWatcher = () => {
  useOnlineStatus();
  return null;
};
