import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendWebPush } from "./_webpush.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Cron-driven function. Runs hourly. For each user with reminders enabled,
 * computes the user's local hour and sends a push if their reminder_time
 * falls within the current hour AND they haven't been notified today.
 */
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

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Pull all profiles with reminders enabled
    const { data: profiles, error: pErr } = await admin
      .from("profiles")
      .select("id, timezone, reminder_time, reminder_enabled")
      .eq("reminder_enabled", true);

    if (pErr) throw pErr;

    const nowUtc = new Date();
    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const p of profiles ?? []) {
      if (!p.reminder_time) {
        skipped++;
        continue;
      }
      const tz = p.timezone || "UTC";

      // Compute user's local hour & date
      let localHour: number;
      let localDate: string;
      try {
        const fmt = new Intl.DateTimeFormat("en-CA", {
          timeZone: tz,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          hourCycle: "h23",
        });
        const parts = fmt.formatToParts(nowUtc);
        const get = (t: string) => parts.find((x) => x.type === t)?.value ?? "";
        localDate = `${get("year")}-${get("month")}-${get("day")}`;
        localHour = parseInt(get("hour"), 10);
      } catch {
        skipped++;
        continue;
      }

      const reminderHour = parseInt(String(p.reminder_time).slice(0, 2), 10);
      if (reminderHour !== localHour) {
        skipped++;
        continue;
      }

      // Already sent today?
      const { data: log } = await admin
        .from("reminder_log")
        .select("id")
        .eq("user_id", p.id)
        .eq("local_date", localDate)
        .maybeSingle();
      if (log) {
        skipped++;
        continue;
      }

      // Get this user's push subs
      const { data: subs } = await admin
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("user_id", p.id);

      if (!subs || subs.length === 0) {
        skipped++;
        continue;
      }

      let userSent = false;
      for (const s of subs) {
        try {
          const res = await sendWebPush(
            { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth },
            {
              title: "Solomon Wealth Code",
              body: "Your daily teaching is ready.",
              url: "/audio",
            },
            { vapidPublicKey, vapidPrivateKey, vapidSubject },
          );
          if (res.status === 404 || res.status === 410) {
            // Subscription gone → remove
            await admin
              .from("push_subscriptions")
              .delete()
              .eq("endpoint", s.endpoint);
          } else if (res.status >= 200 && res.status < 300) {
            userSent = true;
          } else {
            failed++;
            console.warn("push failed", res.status, res.body);
          }
        } catch (err) {
          failed++;
          console.error("push error", err);
        }
      }

      if (userSent) {
        sent++;
        await admin.from("reminder_log").insert({
          user_id: p.id,
          local_date: localDate,
        });
      }
    }

    return new Response(
      JSON.stringify({ ok: true, sent, skipped, failed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("send-daily-reminders fatal", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});