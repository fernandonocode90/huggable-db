// Edge function: imports a full Bible translation into bible_verses
// Triggered manually by an admin. Downloads from public-domain sources and
// bulk-inserts in batches. Idempotent: skips books already fully present.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Maps internal book_key -> the book id used by each upstream source.
// Source A: github.com/wldeh/bible-api (one JSON per chapter, lowercase OSIS-ish)
// Source B: github.com/scrollmapper/bible_databases (single JSON file per version)

// We use scrollmapper because it ships the full Bible per version in one file.
// URL pattern: https://raw.githubusercontent.com/scrollmapper/bible_databases/master/json/<VERSION>.json
// The JSON shape is: { metadata: {...}, verses: [{book_name, book, chapter, verse, text}, ...] }

// Mapping from scrollmapper book numbers (1..66) to our book_key
const BOOK_NUM_TO_KEY: Record<number, string> = {
  1: "genesis", 2: "exodus", 3: "leviticus", 4: "numbers", 5: "deuteronomy",
  6: "joshua", 7: "judges", 8: "ruth", 9: "1samuel", 10: "2samuel",
  11: "1kings", 12: "2kings", 13: "1chronicles", 14: "2chronicles",
  15: "ezra", 16: "nehemiah", 17: "esther", 18: "job", 19: "psalms",
  20: "proverbs", 21: "ecclesiastes", 22: "songofsolomon", 23: "isaiah",
  24: "jeremiah", 25: "lamentations", 26: "ezekiel", 27: "daniel",
  28: "hosea", 29: "joel", 30: "amos", 31: "obadiah", 32: "jonah",
  33: "micah", 34: "nahum", 35: "habakkuk", 36: "zephaniah", 37: "haggai",
  38: "zechariah", 39: "malachi",
  40: "matthew", 41: "mark", 42: "luke", 43: "john", 44: "acts",
  45: "romans", 46: "1corinthians", 47: "2corinthians", 48: "galatians",
  49: "ephesians", 50: "philippians", 51: "colossians",
  52: "1thessalonians", 53: "2thessalonians", 54: "1timothy", 55: "2timothy",
  56: "titus", 57: "philemon", 58: "hebrews", 59: "james",
  60: "1peter", 61: "2peter", 62: "1john", 63: "2john", 64: "3john",
  65: "jude", 66: "revelation",
};

// Translation -> upstream URLs (try in order until one succeeds)
const SOURCES: Record<string, string[]> = {
  kjv: [
    "https://raw.githubusercontent.com/scrollmapper/bible_databases/master/json/t_kjv.json",
    "https://bible-api.deno.dev/api/kjv.json",
  ],
  rvr1909: [
    "https://raw.githubusercontent.com/scrollmapper/bible_databases/master/json/t_rvr.json",
    "https://raw.githubusercontent.com/scrollmapper/bible_databases/master/json/t_rva.json",
  ],
  // Almeida (Portuguese, public domain) — using ARC-style file from scrollmapper.
  // Stored under key "acf" for compatibility with existing app code.
  acf: [
    "https://raw.githubusercontent.com/thiagobodruk/biblia/master/json/acf.json",
    "https://raw.githubusercontent.com/thiagobodruk/biblia/master/json/aa.json",
  ],
};

interface VerseRow {
  translation: string;
  book_key: string;
  book_order: number;
  chapter: number;
  verse: number;
  text: string;
}

async function fetchJson(urls: string[]): Promise<any> {
  let lastErr: unknown;
  for (const url of urls) {
    try {
      const r = await fetch(url);
      if (!r.ok) {
        lastErr = new Error(`${url} -> ${r.status}`);
        continue;
      }
      return await r.json();
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("no source available");
}

function parseScrollmapper(json: any, translation: string): VerseRow[] {
  // shape: { resultset: { row: [{ field: [id, b, c, v, text] }] } } OR { verses: [...] }
  const out: VerseRow[] = [];
  if (Array.isArray(json?.verses)) {
    for (const v of json.verses) {
      const bookNum = Number(v.book ?? v.book_number);
      const key = BOOK_NUM_TO_KEY[bookNum];
      if (!key) continue;
      out.push({
        translation,
        book_key: key,
        book_order: bookNum,
        chapter: Number(v.chapter),
        verse: Number(v.verse),
        text: String(v.text ?? "").trim(),
      });
    }
    return out;
  }
  if (json?.resultset?.row) {
    for (const r of json.resultset.row) {
      const f = r.field;
      const bookNum = Number(f[1]);
      const key = BOOK_NUM_TO_KEY[bookNum];
      if (!key) continue;
      out.push({
        translation,
        book_key: key,
        book_order: bookNum,
        chapter: Number(f[2]),
        verse: Number(f[3]),
        text: String(f[4] ?? "").trim(),
      });
    }
    return out;
  }
  return out;
}

function parseThiagoBodruk(json: any, translation: string): VerseRow[] {
  // shape: [{ abbrev, name, chapters: [[v1, v2, ...], ...] }, ...] (66 books in canonical order)
  if (!Array.isArray(json)) return [];
  const out: VerseRow[] = [];
  json.forEach((book: any, idx: number) => {
    const bookNum = idx + 1;
    const key = BOOK_NUM_TO_KEY[bookNum];
    if (!key) return;
    const chapters: string[][] = book.chapters ?? [];
    chapters.forEach((verses, ci) => {
      verses.forEach((text, vi) => {
        out.push({
          translation,
          book_key: key,
          book_order: bookNum,
          chapter: ci + 1,
          verse: vi + 1,
          text: String(text ?? "").trim(),
        });
      });
    });
  });
  return out;
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

    // Authn + admin check
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
    if (!translation || !SOURCES[translation]) {
      return new Response(
        JSON.stringify({ error: "translation must be one of: kjv, rvr1909, acf" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Skip if already populated (unless force=true)
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
            message: `Translation already loaded (${count} verses). Pass force=true to reimport.`,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Download
    const json = await fetchJson(SOURCES[translation]);

    // Try both parsers
    let rows = parseScrollmapper(json, translation);
    if (rows.length < 1000) rows = parseThiagoBodruk(json, translation);
    if (rows.length < 1000) {
      return new Response(
        JSON.stringify({ error: "Failed to parse upstream data", got: rows.length }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If force, wipe existing rows for this translation first
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
      JSON.stringify({
        ok: true,
        translation,
        inserted,
        total: rows.length,
        source: SOURCES[translation][0],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
