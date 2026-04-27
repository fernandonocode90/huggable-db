// Grant courtesy premium and send notification email via Resend.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FROM_EMAIL = "Solomon Wealth Code <noreply@contact.solomonwealthcode.com>";
const APP_NAME = "Solomon Wealth Code";

interface GrantBody {
  user_id: string;
  months: number | null; // null = lifetime
  reason?: string | null;
}

function isUuid(v: unknown): v is string {
  return (
    typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
  );
}

function buildEmailHtml(opts: {
  displayName: string | null;
  months: number | null;
  reason: string | null;
}) {
  const greeting = opts.displayName ? `Hi ${opts.displayName},` : "Hi there,";
  const durationText =
    opts.months === null
      ? "lifetime access"
      : opts.months === 1
        ? "1 month of premium access"
        : `${opts.months} months of premium access`;
  const reasonBlock = opts.reason
    ? `<p style="font-size:14px;color:#475569;margin:0 0 16px;font-style:italic;">"${opts.reason.replace(/[<>]/g, "")}"</p>`
    : "";

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <tr><td style="padding:32px 32px 0;text-align:center;">
          <div style="font-size:42px;line-height:1;">👑</div>
          <h1 style="font-size:24px;color:#0f172a;margin:16px 0 8px;font-weight:700;">You've been granted Premium</h1>
          <p style="font-size:15px;color:#64748b;margin:0;">A gift from the ${APP_NAME} team</p>
        </td></tr>
        <tr><td style="padding:24px 32px 8px;">
          <p style="font-size:16px;color:#0f172a;margin:0 0 16px;">${greeting}</p>
          <p style="font-size:15px;color:#334155;line-height:1.6;margin:0 0 16px;">
            We've activated <strong>${durationText}</strong> on your ${APP_NAME} account — on us. No payment required, nothing to set up. It's already live.
          </p>
          ${reasonBlock}
          <p style="font-size:15px;color:#334155;line-height:1.6;margin:0 0 24px;">
            Open the app to enjoy everything Premium has to offer.
          </p>
        </td></tr>
        <tr><td style="padding:0 32px 32px;text-align:center;">
          <p style="font-size:13px;color:#94a3b8;margin:24px 0 0;">
            Thank you for being part of ${APP_NAME}.
          </p>
        </td></tr>
      </table>
      <p style="font-size:12px;color:#94a3b8;margin:16px 0 0;">© ${new Date().getFullYear()} ${APP_NAME}</p>
    </td></tr>
  </table>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const body = (await req.json()) as GrantBody;
    if (!isUuid(body.user_id)) {
      return new Response(JSON.stringify({ error: "Invalid user_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const months =
      body.months === null || body.months === undefined
        ? null
        : Number(body.months);
    if (months !== null && (!Number.isInteger(months) || months < 1 || months > 240)) {
      return new Response(JSON.stringify({ error: "Invalid months" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const reason = body.reason?.trim() ? body.reason.trim().slice(0, 500) : null;

    // RPC enforces admin check via has_role(auth.uid(), 'admin')
    const { error: rpcErr } = await userClient.rpc("admin_grant_premium", {
      _user_id: body.user_id,
      _months: months,
      _reason: reason,
    });
    if (rpcErr) {
      return new Response(JSON.stringify({ error: rpcErr.message }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch recipient info for the email (service role to read auth.users + profiles)
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: profile } = await adminClient
      .from("profiles")
      .select("display_name")
      .eq("id", body.user_id)
      .maybeSingle();
    const { data: userRow } = await adminClient.auth.admin.getUserById(body.user_id);
    const recipientEmail = userRow?.user?.email ?? null;

    let emailSent = false;
    let emailError: string | null = null;

    if (recipientEmail) {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (!resendKey) {
        emailError = "RESEND_API_KEY not configured";
      } else {
        const html = buildEmailHtml({
          displayName: profile?.display_name ?? null,
          months,
          reason,
        });
        const subject =
          months === null
            ? `🎁 You've been granted lifetime Premium on ${APP_NAME}`
            : `🎁 You've been granted Premium on ${APP_NAME}`;
        try {
          const r = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: FROM_EMAIL,
              to: [recipientEmail],
              subject,
              html,
            }),
          });
          if (!r.ok) {
            const t = await r.text();
            emailError = `Resend ${r.status}: ${t.slice(0, 300)}`;
          } else {
            emailSent = true;
          }
        } catch (e) {
          emailError = e instanceof Error ? e.message : "send failed";
        }
      }
    } else {
      emailError = "Recipient email not found";
    }

    return new Response(
      JSON.stringify({
        ok: true,
        email: recipientEmail,
        email_sent: emailSent,
        email_error: emailError,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
