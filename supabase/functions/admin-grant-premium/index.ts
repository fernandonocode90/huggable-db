// Grant premium courtesy.
// - If user exists: creates active subscription (provider=manual) + sends "you got premium" email.
// - If user does NOT exist: creates a pending voucher + sends "download the app & sign up" invite email.
// On signup, handle_new_user trigger automatically claims the voucher.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FROM_EMAIL = "Solomon Wealth Code <noreply@contact.solomonwealthcode.com>";
const APP_NAME = "Solomon Wealth Code";
const APP_URL = "https://solomonwealthcode.com"; // landing/download page

interface GrantBody {
  // Either user_id (existing user) OR email (anyone)
  user_id?: string | null;
  email?: string | null;
  months: number | null; // null = lifetime
  reason?: string | null;
}

function isUuid(v: unknown): v is string {
  return (
    typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
  );
}

function isEmail(v: unknown): v is string {
  return typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function durationLabel(months: number | null): string {
  if (months === null) return "lifetime access";
  if (months === 1) return "1 month of premium access";
  return `${months} months of premium access`;
}

function shell(body: string): string {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        ${body}
      </table>
      <p style="font-size:12px;color:#94a3b8;margin:16px 0 0;">© ${new Date().getFullYear()} ${APP_NAME}</p>
    </td></tr>
  </table>
</body></html>`;
}

function buildExistingUserEmail(opts: {
  displayName: string | null;
  months: number | null;
  reason: string | null;
}) {
  const greeting = opts.displayName ? `Hi ${opts.displayName},` : "Hi there,";
  const reasonBlock = opts.reason
    ? `<p style="font-size:14px;color:#475569;margin:0 0 16px;font-style:italic;">"${opts.reason.replace(/[<>]/g, "")}"</p>`
    : "";
  return shell(`
    <tr><td style="padding:32px 32px 0;text-align:center;">
      <div style="font-size:42px;line-height:1;">👑</div>
      <h1 style="font-size:24px;color:#0f172a;margin:16px 0 8px;font-weight:700;">You've been granted Premium</h1>
      <p style="font-size:15px;color:#64748b;margin:0;">A gift from the ${APP_NAME} team</p>
    </td></tr>
    <tr><td style="padding:24px 32px 8px;">
      <p style="font-size:16px;color:#0f172a;margin:0 0 16px;">${greeting}</p>
      <p style="font-size:15px;color:#334155;line-height:1.6;margin:0 0 16px;">
        We've activated <strong>${durationLabel(opts.months)}</strong> on your ${APP_NAME} account — on us. No payment required, nothing to set up. It's already live.
      </p>
      ${reasonBlock}
      <p style="font-size:15px;color:#334155;line-height:1.6;margin:0 0 24px;">
        Open the app to enjoy everything Premium has to offer.
      </p>
    </td></tr>
    <tr><td style="padding:0 32px 32px;text-align:center;">
      <p style="font-size:13px;color:#94a3b8;margin:24px 0 0;">Thank you for being part of ${APP_NAME}.</p>
    </td></tr>
  `);
}

function buildVoucherInviteEmail(opts: {
  email: string;
  months: number | null;
  reason: string | null;
}) {
  const reasonBlock = opts.reason
    ? `<p style="font-size:14px;color:#475569;margin:0 0 16px;font-style:italic;">"${opts.reason.replace(/[<>]/g, "")}"</p>`
    : "";
  return shell(`
    <tr><td style="padding:32px 32px 0;text-align:center;">
      <div style="font-size:42px;line-height:1;">🎁</div>
      <h1 style="font-size:24px;color:#0f172a;margin:16px 0 8px;font-weight:700;">A Premium gift is waiting for you</h1>
      <p style="font-size:15px;color:#64748b;margin:0;">From the ${APP_NAME} team</p>
    </td></tr>
    <tr><td style="padding:24px 32px 8px;">
      <p style="font-size:16px;color:#0f172a;margin:0 0 16px;">Hi there,</p>
      <p style="font-size:15px;color:#334155;line-height:1.6;margin:0 0 16px;">
        We've reserved <strong>${durationLabel(opts.months)}</strong> on ${APP_NAME} for you — completely free.
      </p>
      ${reasonBlock}
      <p style="font-size:15px;color:#334155;line-height:1.6;margin:0 0 24px;">
        To claim it, just download the app and sign up using this email address (<strong>${opts.email}</strong>). Your Premium will activate automatically — no codes, no payment.
      </p>
      <div style="text-align:center;margin:0 0 24px;">
        <a href="${APP_URL}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 28px;border-radius:10px;">Download ${APP_NAME}</a>
      </div>
      <p style="font-size:13px;color:#64748b;line-height:1.6;margin:0;">
        Important: sign up with <strong>${opts.email}</strong>. If you use a different email, the gift won't be linked to your account.
      </p>
    </td></tr>
    <tr><td style="padding:0 32px 32px;text-align:center;">
      <p style="font-size:13px;color:#94a3b8;margin:24px 0 0;">See you inside ${APP_NAME}.</p>
    </td></tr>
  `);
}

async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<{ ok: boolean; error: string | null }> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return { ok: false, error: "RESEND_API_KEY not configured" };
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM_EMAIL, to: [opts.to], subject: opts.subject, html: opts.html }),
    });
    if (!r.ok) {
      const t = await r.text();
      return { ok: false, error: `Resend ${r.status}: ${t.slice(0, 300)}` };
    }
    return { ok: true, error: null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "send failed" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

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
    const adminClient = createClient(supabaseUrl, serviceKey);

    const body = (await req.json()) as GrantBody;

    // Validate months
    const months =
      body.months === null || body.months === undefined ? null : Number(body.months);
    if (months !== null && (!Number.isInteger(months) || months < 1 || months > 240)) {
      return new Response(JSON.stringify({ error: "Invalid months" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const reason = body.reason?.trim() ? body.reason.trim().slice(0, 500) : null;

    // ---- Path A: existing user by user_id ----
    if (body.user_id) {
      if (!isUuid(body.user_id)) {
        return new Response(JSON.stringify({ error: "Invalid user_id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error: rpcErr } = await userClient.rpc("admin_grant_premium", {
        _user_id: body.user_id, _months: months, _reason: reason,
      });
      if (rpcErr) {
        return new Response(JSON.stringify({ error: rpcErr.message }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: profile } = await adminClient
        .from("profiles").select("display_name").eq("id", body.user_id).maybeSingle();
      const { data: userRow } = await adminClient.auth.admin.getUserById(body.user_id);
      const recipientEmail = userRow?.user?.email ?? null;

      let emailSent = false;
      let emailError: string | null = null;
      if (recipientEmail) {
        const html = buildExistingUserEmail({
          displayName: profile?.display_name ?? null,
          months, reason,
        });
        const subject = months === null
          ? `🎁 You've been granted lifetime Premium on ${APP_NAME}`
          : `🎁 You've been granted Premium on ${APP_NAME}`;
        const r = await sendEmail({ to: recipientEmail, subject, html });
        emailSent = r.ok; emailError = r.error;
      } else {
        emailError = "Recipient email not found";
      }

      return new Response(JSON.stringify({
        ok: true, kind: "existing_user", email: recipientEmail,
        email_sent: emailSent, email_error: emailError,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ---- Path B: by email (existing or not) ----
    if (!isEmail(body.email)) {
      return new Response(JSON.stringify({ error: "Provide a valid user_id or email" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const targetEmail = body.email!.trim().toLowerCase();

    // Try to find existing auth user with this email
    // (no native getUserByEmail; use listUsers filter)
    const { data: existing, error: lookErr } = await adminClient.auth.admin.listUsers({
      page: 1, perPage: 1,
    });
    if (lookErr) {
      // continue anyway; we'll fallback to voucher
      console.error("listUsers error", lookErr);
    }
    // listUsers doesn't filter by email server-side; do a profile search instead
    const { data: foundUserRow } = await adminClient
      .from("profiles")
      .select("id")
      .limit(1)
      .maybeSingle();
    void foundUserRow; // unused — we use auth lookup below

    // Robust email lookup via auth schema using a service-role RPC equivalent:
    // We query auth.users directly via the admin client's auth schema is not exposed,
    // so we use listUsers with page iteration and email filter.
    let foundId: string | null = null;
    let foundDisplayName: string | null = null;
    {
      // Use the GoTrue admin endpoint which DOES support filter
      const ulist = await adminClient.auth.admin.listUsers({
        page: 1, perPage: 200,
      });
      for (const u of ulist.data?.users ?? []) {
        if ((u.email ?? "").toLowerCase() === targetEmail) {
          foundId = u.id;
          break;
        }
      }
    }
    if (foundId) {
      const { data: prof } = await adminClient
        .from("profiles").select("display_name").eq("id", foundId).maybeSingle();
      foundDisplayName = prof?.display_name ?? null;

      const { error: rpcErr } = await userClient.rpc("admin_grant_premium", {
        _user_id: foundId, _months: months, _reason: reason,
      });
      if (rpcErr) {
        return new Response(JSON.stringify({ error: rpcErr.message }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const html = buildExistingUserEmail({ displayName: foundDisplayName, months, reason });
      const subject = months === null
        ? `🎁 You've been granted lifetime Premium on ${APP_NAME}`
        : `🎁 You've been granted Premium on ${APP_NAME}`;
      const r = await sendEmail({ to: targetEmail, subject, html });
      return new Response(JSON.stringify({
        ok: true, kind: "existing_user", email: targetEmail,
        email_sent: r.ok, email_error: r.error,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // No existing user → create voucher and invite
    const { data: voucherId, error: vErr } = await userClient.rpc("admin_create_voucher", {
      _email: targetEmail, _months: months, _reason: reason,
    });
    if (vErr) {
      return new Response(JSON.stringify({ error: vErr.message }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const html = buildVoucherInviteEmail({ email: targetEmail, months, reason });
    const subject = `🎁 A free Premium gift for you on ${APP_NAME}`;
    const r = await sendEmail({ to: targetEmail, subject, html });
    return new Response(JSON.stringify({
      ok: true, kind: "voucher", voucher_id: voucherId, email: targetEmail,
      email_sent: r.ok, email_error: r.error,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
