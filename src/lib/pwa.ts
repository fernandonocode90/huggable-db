import { supabase } from "@/integrations/supabase/client";

export const isNativeCapacitor = (): boolean => {
  if (typeof window === "undefined") return false;
  // Capacitor injects window.Capacitor at runtime in native builds.
  const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
  if (!w.Capacitor) return false;
  try {
    return typeof w.Capacitor.isNativePlatform === "function"
      ? w.Capacitor.isNativePlatform()
      : true;
  } catch {
    return true;
  }
};

export const isPreviewOrIframe = (): boolean => {
  if (typeof window === "undefined") return true;
  let inIframe = false;
  try {
    inIframe = window.self !== window.top;
  } catch {
    inIframe = true;
  }
  const host = window.location.hostname;
  const isPreviewHost =
    host.includes("id-preview--") ||
    host.includes("lovableproject.com") ||
    (host.includes("lovable.app") === false && host === "localhost");
  return inIframe || isPreviewHost;
};

export const isPushSupported = (): boolean =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

export const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
};

export const arrayBufferToBase64 = (buffer: ArrayBuffer | null): string => {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};

export const registerServiceWorker = async (): Promise<void> => {
  if (!("serviceWorker" in navigator)) return;
  if (isPreviewOrIframe()) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    } catch { /* noop */ }
    return;
  }
  try {
    await navigator.serviceWorker.register("/sw.js", { type: "classic" });
  } catch (err) {
    console.warn("SW registration failed", err);
  }
};

export interface PushSubscribeResult {
  ok: boolean;
  reason?: "unsupported" | "denied" | "no-vapid" | "no-sw" | "error";
  error?: string;
}

export const subscribeToPush = async (vapidPublicKey: string): Promise<PushSubscribeResult> => {
  if (!isPushSupported()) return { ok: false, reason: "unsupported" };
  if (isPreviewOrIframe()) return { ok: false, reason: "unsupported" };
  if (!vapidPublicKey) return { ok: false, reason: "no-vapid" };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, reason: "denied" };

  const reg = await navigator.serviceWorker.ready;
  if (!reg) return { ok: false, reason: "no-sw" };

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
    });
  }

  const json = sub.toJSON();
  const endpoint = json.endpoint!;
  const p256dh = json.keys?.p256dh ?? "";
  const auth = json.keys?.auth ?? "";

  const { error } = await supabase.functions.invoke("save-push-subscription", {
    body: { endpoint, p256dh, auth, user_agent: navigator.userAgent },
  });

  if (error) return { ok: false, reason: "error", error: error.message };
  return { ok: true };
};

export const unsubscribeFromPush = async (): Promise<void> => {
  if (!("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  await supabase.functions.invoke("save-push-subscription", {
    body: { endpoint, remove: true },
  });
};
