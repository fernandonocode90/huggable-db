// Edge function: imports a full Bible translation into bible_verses.
// Triggered manually by an admin from the Admin Sanctuary.
//
// Sources (all free / public domain or open-data):
//   - KJV     -> bolls.life chapter API
//   - RVR1909 -> bolls.life chapter API (translation slug RV1909)
//   - ACF (PT)-> thiagobodruk/biblia (single JSON for the whole Bible)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// (book_num, book_key, chapter_count) — canonical 66-book order
const BOOKS: { num: number; key: string; chapters: number }[] = [
  { num: 1, key: "genesis", chapters: 50 },
  { num: 2, key: "exodus", chapters: 40 },
  { num: 3, key: "leviticus", chapters: 27 },
  { num: 4, key: "numbers", chapters: 36 },
  { num: 5, key: "deuteronomy", chapters: 34 },
  { num: 6, key: "joshua", chapters: 24 },
  { num: 7, key: "judges", chapters: 21 },
  { num: 8, key: "ruth", chapters: 4 },
  { num: 9, key: "1samuel", chapters: 31 },
  { num: 10, key: "2samuel", chapters: 24 },
  { num: 11, key: "1kings", chapters: 22 },
  { num: 12, key: "2kings", chapters: 25 },
  { num: 13, key: "1chronicles", chapters: 29 },
  { num: 14, key: "2chronicles", chapters: 36 },
  { num: 15, key: "ezra", chapters: 10 },
  { num: 16, key: "nehemiah", chapters: 13 },
  { num: 17, key: "esther", chapters: 10 },
  { num: 18, key: "job", chapters: 42 },
  { num: 19, key: "psalms", chapters: 150 },
  { num: 20, key: "proverbs", chapters: 31 },
  { num: 21, key: "ecclesiastes", chapters: 12 },
  { num: 22, key: "songofsolomon", chapters: 8 },
  { num: 23, key: "isaiah", chapters: 66 },
  { num: 24, key: "jeremiah", chapters: 52 },
  { num: 25, key: "lamentations", chapters: 5 },
  { num: 26, key: "ezekiel", chapters: 48 },
  { num: 27, key: "daniel", chapters: 12 },
  { num: 28, key: "hosea", chapters: 14 },
  { num: 29, key: "joel", chapters: 3 },
  { num: 30, key: "amos", chapters: 9 },
  { num: 31, key: "obadiah", chapters: 1 },
  { num: 32, key: "jonah", chapters: 4 },
  { num: 33, key: "micah", chapters: 7 },
  { num: 34, key: "nahum", chapters: 3 },
  { num: 35, key: "habakkuk", chapters: 3 },
  { num: 36, key: "zephaniah", chapters: 3 },
  { num: 37, key: "haggai", chapters: 2 },
  { num: 38, key: "zechariah", chapters: 14 },
  { num: 39, key: "malachi", chapters: 4 },
  { num: 40, key: "matthew", chapters: 28 },
  { num: 41, key: "mark", chapters: 16 },
  { num: 42, key: "luke", chapters: 24 },
  { num: 43, key: "john", chapters: 21 },
  { num: 44, key: "acts", chapters: 28 },
  { num: 45, key: "romans", chapters: 16 },
  { num: 46, key: "1corinthians", chapters: 16 },
  { num: 47, key: "2corinthians", chapters: 13 },
  { num: 48, key: "galatians", chapters: 6 },
  { num: 49, key: "ephesians", chapters: 6 },
  { num: 50, key: "philippians", chapters: 4 },
  { num: 51, key: "colossians", chapters: 4 },
  { num: 52, key: "1thessalonians", chapters: 5 },
  { num: 53, key: "2thessalonians", chapters: 3 },
  { num: 54, key: "1timothy", chapters: 6 },
  { num: 55, key: "2timothy", chapters: 4 },
  { num: 56, key: "titus", chapters: 3 },
  { num: 57, key: "philemon", chapters: 1 },
  { num: 58, key: "hebrews", chapters: 13 },
  { num: 59, key: "james", chapters: 5 },
  { num: 60, key: "1peter", chapters: 5 },
  { num: 61, key: "2peter", chapters: 3 },
  { num: 62, key: "1john", chapters: 5 },
  { num: 63, key: "2john", chapters: 1 },
  { num: 64, key: "3john", chapters: 1 },
  { num: 65, key: "jude", chapters: 1 },
  { num: 66, key: "revelation", chapters: 22 },
];

interface VerseRow {
  translation: string;
  book_key: string;
  book_order: number;
  chapter: number;
  verse: number;
  text: string;
}

// Strip Strong's tags like <S>1234</S>, <i>...</i>, <pb/> etc.
function cleanText(t: string): string {
  return t
    .replace(/<S>\d+<\/S>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchBollsTranslation(
  slug: string,
  translation: string,
  onProgress?: (done: number, total: number) => void
): Promise<VerseRow[]> {
  const out: VerseRow[] = [];
  const totalChapters = BOOKS.reduce((s, b) => s + b.chapters, 0);
  let doneChapters = 0;

  // Fetch in parallel batches of 8 chapters at a time
  const tasks: { book: typeof BOOKS[number]; chapter: number }[] = [];
  for (const book of BOOKS) {
    for (let c = 1; c <= book.chapters; c++) {
      tasks.push({ book, chapter: c });
    }
  }

  const BATCH = 8;
  for (let i = 0; i < tasks.length; i += BATCH) {
    const slice = tasks.slice(i, i + BATCH);
    const results = await Promise.all(
      slice.map(async ({ book, chapter }) => {
        const url = `https://bolls.life/get-text/${slug}/${book.num}/${chapter}/`;
        try {
          const r = await fetch(url);
          if (!r.ok) return [];
          const data = await r.json();
          if (!Array.isArray(data)) return [];
          return data.map((v: { verse: number; text: string }) => ({
            translation,
            book_key: book.key,
            book_order: book.num,
            chapter,
            verse: Number(v.verse),
            text: cleanText(String(v.text ?? "")),
          })) as VerseRow[];
        } catch {
          return [];
        }
      })
    );
    for (const rows of results) out.push(...rows);
    doneChapters += slice.length;
    onProgress?.(doneChapters, totalChapters);
  }

  return out;
}

// Parses thiagobodruk/biblia format: array of 66 books, each with `chapters: string[][]`
function parseThiagoBodruk(json: unknown, translation: string): VerseRow[] {
  if (!Array.isArray(json)) return [];
  const out: VerseRow[] = [];
  json.forEach((book: { chapters?: string[][] }, idx: number) => {
    const meta = BOOKS[idx];
    if (!meta) return;
    const chapters = book.chapters ?? [];
    chapters.forEach((verses, ci) => {
      verses.forEach((text, vi) => {
        out.push({
          translation,
          book_key: meta.key,
          book_order: meta.num,
          chapter: ci + 1,
          verse: vi + 1,
          text: cleanText(String(text ?? "")),
        });
      });
    });
  });
  return out;
}

async function fetchAlmeidaPT(translation: string): Promise<VerseRow[]> {
  const r = await fetch(
    "https://raw.githubusercontent.com/thiagobodruk/biblia/master/json/acf.json"
  );
  if (!r.ok) throw new Error(`thiagobodruk acf.json -> ${r.status}`);
  // File is encoded as ISO-8859-1 in the repo; force UTF-8 by reading bytes
  const buf = await r.arrayBuffer();
  const text = new TextDecoder("iso-8859-1").decode(buf);
  const json = JSON.parse(text);
  return parseThiagoBodruk(json, translation);
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

    // Download
    let rows: VerseRow[] = [];
    if (translation === "kjv") {
      rows = await fetchBollsTranslation("KJV", translation);
    } else if (translation === "rvr1909") {
      rows = await fetchBollsTranslation("RV1909", translation);
    } else if (translation === "acf") {
      rows = await fetchAlmeidaPT(translation);
    }

    if (rows.length < 1000) {
      return new Response(
        JSON.stringify({ error: "Upstream returned too few verses", got: rows.length }),
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
      JSON.stringify({ ok: true, translation, inserted, total: rows.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
