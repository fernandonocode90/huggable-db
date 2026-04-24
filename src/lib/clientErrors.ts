import { supabase } from "@/integrations/supabase/client";

/**
 * Reports a client-side error to the database for admin review.
 * Fails silently — never throws or blocks the UI.
 */
export async function reportClientError(error: Error, route?: string) {
  try {
    const { data: auth } = await supabase.auth.getUser();
    await supabase.from("client_errors").insert({
      user_id: auth?.user?.id ?? null,
      message: (error.message || "Unknown error").slice(0, 500),
      stack: error.stack ? error.stack.slice(0, 4000) : null,
      route: route ?? (typeof window !== "undefined" ? window.location.pathname : null),
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null,
      app_version: import.meta.env.MODE,
    });
  } catch {
    /* swallow — error reporting must never crash */
  }
}
