// Admin only: list objects in R2 bucket under daily_audios/ prefix
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
const toHex = (b: Uint8Array) => Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
const sha256Hex = async (s: string) => toHex(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(s))));
async function hmac(key: ArrayBuffer | Uint8Array, data: string) {
  const k = await crypto.subtle.importKey("raw", key instanceof Uint8Array ? key : new Uint8Array(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(data)));
}

async function signedListRequest() {
  const host = `${ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const now = new Date();
  const amz = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amz.slice(0, 8);
  const scope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
  const params = new URLSearchParams({
    "list-type": "2",
    prefix: "daily_audios/",
  });
  const canonicalUri = `/${BUCKET}`;
  const payloadHash = await sha256Hex("");
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amz}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalReq = ["GET", canonicalUri, params.toString(), canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", amz, scope, await sha256Hex(canonicalReq)].join("\n");
  const kDate = await hmac(enc.encode(`AWS4${SECRET_KEY}`), dateStamp);
  const kReg = await hmac(kDate, REGION);
  const kSvc = await hmac(kReg, SERVICE);
  const kSign = await hmac(kSvc, "aws4_request");
  const sig = toHex(await hmac(kSign, stringToSign));
  const auth = `AWS4-HMAC-SHA256 Credential=${ACCESS_KEY}/${scope}, SignedHeaders=${signedHeaders}, Signature=${sig}`;
  return fetch(`https://${host}${canonicalUri}?${params.toString()}`, {
    method: "GET",
    headers: { host, "x-amz-date": amz, "x-amz-content-sha256": payloadHash, Authorization: auth },
  });
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

    const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const r = await signedListRequest();
    const xml = await r.text();
    if (!r.ok) return new Response(JSON.stringify({ error: xml }), { status: r.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const keys: { key: string; size: number; lastModified: string }[] = [];
    const regex = /<Contents>([\s\S]*?)<\/Contents>/g;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(xml)) !== null) {
      const block = m[1];
      const key = block.match(/<Key>(.*?)<\/Key>/)?.[1] ?? "";
      const size = Number(block.match(/<Size>(\d+)<\/Size>/)?.[1] ?? 0);
      const lastModified = block.match(/<LastModified>(.*?)<\/LastModified>/)?.[1] ?? "";
      if (key && key !== "daily_audios/") keys.push({ key, size, lastModified });
    }
    return new Response(JSON.stringify({ objects: keys }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});