// Returns presigned GET URL for an R2 object (audio playback)
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
const toHex = (b: Uint8Array) => Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
const sha256Hex = async (s: string) => toHex(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(s))));

async function presignGet(key: string, expires = 3600) {
  const host = `${ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const now = new Date();
  const amz = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amz.slice(0, 8);
  const scope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
  const params = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${ACCESS_KEY}/${scope}`,
    "X-Amz-Date": amz,
    "X-Amz-Expires": String(expires),
    "X-Amz-SignedHeaders": "host",
  });
  const canonicalUri = `/${BUCKET}/${key.split("/").map(encodeURIComponent).join("/")}`;
  const sorted = new URLSearchParams([...params.entries()].sort());
  const canonicalReq = ["GET", canonicalUri, sorted.toString(), `host:${host}\n`, "host", "UNSIGNED-PAYLOAD"].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", amz, scope, await sha256Hex(canonicalReq)].join("\n");
  const kDate = await hmac(enc.encode(`AWS4${SECRET_KEY}`), dateStamp);
  const kReg = await hmac(kDate, REGION);
  const kSvc = await hmac(kReg, SERVICE);
  const kSign = await hmac(kSvc, "aws4_request");
  const sig = toHex(await hmac(kSign, stringToSign));
  sorted.set("X-Amz-Signature", sig);
  return `https://${host}${canonicalUri}?${sorted.toString()}`;
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
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return new Response(JSON.stringify({ error: "unauth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { key } = await req.json();
    if (!key || typeof key !== "string") return new Response(JSON.stringify({ error: "invalid key" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Verify the key exists in daily_audios + RLS lets the user see it
    const { data: audio } = await supabase.from("daily_audios").select("id").eq("r2_key", key).maybeSingle();
    if (!audio) return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const url = await presignGet(key, 3600);
    return new Response(JSON.stringify({ url }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});