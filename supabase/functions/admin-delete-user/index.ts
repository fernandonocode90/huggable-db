// Admin-only: permanently delete a user (auth + all data).
// Caller must be authenticated AND have role 'admin'.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const callerId = claimsData.claims.sub as string;

    // Parse body
    const body = await req.json().catch(() => ({}));
    const targetId = typeof body?.user_id === "string" ? body.user_id : null;
    if (!targetId) return json({ error: "user_id is required" }, 400);
    if (targetId === callerId) return json({ error: "You cannot delete your own account here" }, 400);

    const admin = createClient(supabaseUrl, serviceKey);

    // Verify caller is admin via the role table
    const { data: roleRow, error: roleErr } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();
    if (roleErr) return json({ error: roleErr.message }, 500);
    if (!roleRow) return json({ error: "Forbidden: admin only" }, 403);

    // Cleanup storage (avatar)
    try {
      const { data: files } = await admin.storage.from("avatars").list(targetId);
      if (files && files.length > 0) {
        await admin.storage
          .from("avatars")
          .remove(files.map((f) => `${targetId}/${f.name}`));
      }
    } catch (e) {
      console.warn("avatar cleanup error", e);
    }

    // Cleanup app data (best-effort; ignore individual errors so we still try auth delete)
    const tables = [
      "audio_progress",
      "bible_bookmarks",
      "bible_reading_history",
      "calculator_simulations",
      "saved_calculations",
      "push_subscriptions",
      "reminder_log",
      "client_errors",
      "user_admin_notes",
      "user_bans",
      "subscribers",
      "user_roles",
    ] as const;
    for (const t of tables) {
      const { error } = await admin.from(t).delete().eq("user_id", targetId);
      if (error) console.warn(`cleanup ${t} error`, error.message);
    }
    // profiles uses id, not user_id
    {
      const { error } = await admin.from("profiles").delete().eq("id", targetId);
      if (error) console.warn("cleanup profiles error", error.message);
    }

    // Audit log (must run as the admin caller — RLS allows admins only)
    try {
      await userClient.rpc("log_admin_action", {
        _action: "delete_user",
        _entity_type: "user",
        _entity_id: targetId,
        _metadata: {},
      });
    } catch (e) {
      console.warn("audit log failed", e);
    }

    // Finally delete the auth user
    const { error: delErr } = await admin.auth.admin.deleteUser(targetId);
    if (delErr) {
      console.error("auth delete error", delErr);
      return json({ error: delErr.message }, 500);
    }

    return json({ ok: true });
  } catch (e) {
    console.error("admin-delete-user fatal", e);
    return json({ error: (e as Error).message ?? "unknown" }, 500);
  }
});
