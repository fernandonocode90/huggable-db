import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendWebPush } from "./_webpush.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Body {
  title: string;
  body: string;
  url?: string;
  // Optional targeting
  user_ids?: string[]; // if omitted → broadcast to all
  only_active_days?: number; // only users active in last N days
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT");
    if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
      return new Response(JSON.stringify({ error: "VAPID keys missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = (await req.json()) as Body;
    const title = (payload.title ?? "").trim();
    const body = (payload.body ?? "").trim();
    if (!title || !body) {
      return new Response(JSON.stringify({ error: "title and body required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (title.length > 120 || body.length > 400) {
      return new Response(JSON.stringify({ error: "title/body too long" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine target users
    let targetUserIds: string[] | null = null;
    if (Array.isArray(payload.user_ids) && payload.user_ids.length > 0) {
      targetUserIds = payload.user_ids;
    } else if (payload.only_active_days && payload.only_active_days > 0) {
      const since = new Date(Date.now() - payload.only_active_days * 86400_000).toISOString();
      const { data: active } = await admin
        .from("audio_progress")
        .select("user_id")
        .gte("updated_at", since);
      targetUserIds = Array.from(new Set((active ?? []).map((r) => r.user_id)));
    }

    // Fetch subscriptions
    let subsQuery = admin.from("push_subscriptions").select("user_id, endpoint, p256dh, auth");
    if (targetUserIds) {
      if (targetUserIds.length === 0) {
        return new Response(
          JSON.stringify({ ok: true, sent: 0, failed: 0, removed: 0, target_users: 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      subsQuery = subsQuery.in("user_id", targetUserIds);
    }
    const { data: subs, error: sErr } = await subsQuery;
    if (sErr) throw sErr;

    let sent = 0;
    let failed = 0;
    let removed = 0;

    for (const s of subs ?? []) {
      try {
        const res = await sendWebPush(
          { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth },
          { title, body, url: payload.url || "/" },
          { vapidPublicKey, vapidPrivateKey, vapidSubject },
        );
        if (res.status === 404 || res.status === 410) {
          await admin.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
          removed++;
        } else if (res.status >= 200 && res.status < 300) {
          sent++;
        } else {
          failed++;
        }
      } catch (err) {
        failed++;
        console.error("push error", err);
      }
    }

    // Audit log
    await admin.from("admin_audit_log").insert({
      admin_id: user.id,
      action: "broadcast_push",
      entity_type: "push",
      metadata: {
        title,
        body,
        url: payload.url ?? null,
        target_users: targetUserIds?.length ?? "all",
        sent,
        failed,
        removed,
      },
    });

    return new Response(
      JSON.stringify({
        ok: true,
        sent,
        failed,
        removed,
        target_users: targetUserIds?.length ?? "all",
        total_subs: subs?.length ?? 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("admin-broadcast-push fatal", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
