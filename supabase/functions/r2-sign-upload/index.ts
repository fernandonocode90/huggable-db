// Generate presigned PUT URL for Cloudflare R2 (S3 compatible)
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const ACCOUNT_ID = Deno.env.get("R2_ACCOUNT_ID")!;
const ACCESS_KEY = Deno.env.get("R2_ACCESS_KEY_ID")!;
const SECRET_KEY = Deno.env.get("R2_SECRET_ACCESS_KEY")!;
const BUCKET = Deno.env.get("R2_BUCKET")!;
const REGION = "auto";
const SERVICE = "s3";

const enc = new TextEncoder();

async function hmac(key: ArrayBuffer | Uint8Array, data: string) {
  const k = await crypto.subtle.importKey(
    "raw",
    key instanceof Uint8Array ? key : new Uint8Array(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(data)));
}

function toHex(bytes: Uint8Array) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(s));
  return toHex(new Uint8Array(buf));
}

function amzDate(d: Date) {
  const iso = d.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return { amzDate: iso, dateStamp: iso.slice(0, 8) };
}

async function presignPutUrl(key: string, expiresSeconds = 600, contentType = "audio/mpeg") {
  const host = `${ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const { amzDate: amz, dateStamp } = amzDate(new Date());
  const credentialScope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
  const credential = `${ACCESS_KEY}/${credentialScope}`;

  const params = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": credential,
    "X-Amz-Date": amz,
    "X-Amz-Expires": String(expiresSeconds),
    "X-Amz-SignedHeaders": "host",
  });

  const canonicalUri = `/${BUCKET}/${key.split("/").map(encodeURIComponent).join("/")}`;
  const sortedParams = new URLSearchParams([...params.entries()].sort());
  const canonicalRequest = [
    "PUT",
    canonicalUri,
    sortedParams.toString(),
    `host:${host}\n`,
    "host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amz,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  const kDate = await hmac(enc.encode(`AWS4${SECRET_KEY}`), dateStamp);
  const kRegion = await hmac(kDate, REGION);
  const kService = await hmac(kRegion, SERVICE);
  const kSigning = await hmac(kService, "aws4_request");
  const signature = toHex(await hmac(kSigning, stringToSign));

  sortedParams.set("X-Amz-Signature", signature);
  return `https://${host}${canonicalUri}?${sortedParams.toString()}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "no auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: uErr } = await supabase.auth.getUser();
    if (uErr || !userData.user) return new Response(JSON.stringify({ error: "unauth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const contentType = String(body.contentType ?? "audio/mpeg");
    const filename = String(body.filename ?? "audio.mp3");
    const dayNumber = Number(body.dayNumber);
    if (!Number.isInteger(dayNumber) || dayNumber < 1) {
      return new Response(
        JSON.stringify({ error: "dayNumber required (positive integer)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Extract extension from original filename
    const extMatch = filename.match(/\.([a-zA-Z0-9]+)$/);
    const ext = (extMatch ? extMatch[1] : "mp3").toLowerCase();
    const dayPadded = String(dayNumber).padStart(3, "0");
    // Standard pattern: day_001.mp3, day_002.mp3...
    const key = `daily_audios/day_${dayPadded}.${ext}`;

    const url = await presignPutUrl(key, 600, contentType);
    return new Response(JSON.stringify({ url, key, bucket: BUCKET }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});