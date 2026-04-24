// Edge function: imports a full Bible translation into bible_verses.
// Reads pre-built TSV.gz files hosted as static assets in /public/bible/
// of the calling app (Origin header). Files contain ~31k pre-cleaned rows each.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface VerseRow {
  translation: string;
  book_key: string;
  book_order: number;
  chapter: number;
  verse: number;
  text: string;
}

function unescapeTsv(s: string): string {
  return s
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\\/g, "\\");
}

function parseTsv(text: string): VerseRow[] {
  const out: VerseRow[] = [];
  for (const line of text.split("\n")) {
    if (!line) continue;
    const parts = line.split("\t");
    if (parts.length < 6) continue;
    const [translation, book_key, book_order, chapter, verse, ...rest] = parts;
    out.push({
      translation,
      book_key,
      book_order: Number(book_order),
      chapter: Number(chapter),
      verse: Number(verse),
      text: unescapeTsv(rest.join("\t")),
    });
  }
  return out;
}

async function fetchTsvGz(url: string): Promise<VerseRow[]> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Fetch ${url} -> ${r.status}`);
  const ds = new DecompressionStream("gzip");
  const decompressed = r.body!.pipeThrough(ds);
  const text = await new Response(decompressed).text();
  return parseTsv(text);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Auth + admin
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    const { data: userRes, error: uErr } = await supabase.auth.getUser(jwt);
    if (uErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userRes.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const translation: string = body.translation;
    const force: boolean = !!body.force;
    const customBaseUrl: string | undefined = body.baseUrl;
    const valid = ["kjv", "rvr1909", "acf"];
    if (!valid.includes(translation)) {
      return new Response(
        JSON.stringify({ error: "translation must be one of: kjv, rvr1909, acf" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!force) {
      const { count } = await supabase
        .from("bible_verses")
        .select("*", { count: "exact", head: true })
        .eq("translation", translation);
      if ((count ?? 0) > 30000) {
        return new Response(
          JSON.stringify({
            ok: true,
            translation,
            inserted: 0,
            skipped: true,
            existing: count,
            message: `Already loaded (${count} verses). Pass force=true to reimport.`,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Resolve base URL: prefer body.baseUrl, then Origin header
    const origin = req.headers.get("origin") ?? "";
    const baseUrl = (customBaseUrl || origin).replace(/\/$/, "");
    if (!baseUrl) {
      return new Response(
        JSON.stringify({ error: "Missing Origin or baseUrl" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map translation -> static file
    const fileMap: Record<string, string> = {
      kjv: `${baseUrl}/bible/kjv.tsv.gz`,
      acf: `${baseUrl}/bible/acf.tsv.gz`,
      rvr1909: `${baseUrl}/bible/rv.tsv.gz`,
    };

    const rows = await fetchTsvGz(fileMap[translation]);
    if (rows.length < 1000) {
      return new Response(
        JSON.stringify({ error: "Source file too small", got: rows.length }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (force) {
      await supabase.from("bible_verses").delete().eq("translation", translation);
    }

    // Bulk insert in batches of 1000
    const BATCH = 1000;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += BATCH) {
      const slice = rows.slice(i, i + BATCH);
      const { error } = await supabase.from("bible_verses").insert(slice);
      if (error) {
        return new Response(
          JSON.stringify({
            error: error.message,
            inserted_so_far: inserted,
            total: rows.length,
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      inserted += slice.length;
    }

    return new Response(
      JSON.stringify({ ok: true, translation, inserted, total: rows.length, source: fileMap[translation] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
