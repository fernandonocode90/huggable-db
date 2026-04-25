import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BOOKS: { num: number; key: string; chapters: number; esName: string }[] = [
  { num: 1, key: "genesis", chapters: 50, esName: "Génesis" },
  { num: 2, key: "exodus", chapters: 40, esName: "Éxodo" },
  { num: 3, key: "leviticus", chapters: 27, esName: "Levítico" },
  { num: 4, key: "numbers", chapters: 36, esName: "Números" },
  { num: 5, key: "deuteronomy", chapters: 34, esName: "Deuteronomio" },
  { num: 6, key: "joshua", chapters: 24, esName: "Josué" },
  { num: 7, key: "judges", chapters: 21, esName: "Jueces" },
  { num: 8, key: "ruth", chapters: 4, esName: "Rut" },
  { num: 9, key: "1samuel", chapters: 31, esName: "1 Samuel" },
  { num: 10, key: "2samuel", chapters: 24, esName: "2 Samuel" },
  { num: 11, key: "1kings", chapters: 22, esName: "1 Reyes" },
  { num: 12, key: "2kings", chapters: 25, esName: "2 Reyes" },
  { num: 13, key: "1chronicles", chapters: 29, esName: "1 Crónicas" },
  { num: 14, key: "2chronicles", chapters: 36, esName: "2 Crónicas" },
  { num: 15, key: "ezra", chapters: 10, esName: "Esdras" },
  { num: 16, key: "nehemiah", chapters: 13, esName: "Nehemías" },
  { num: 17, key: "esther", chapters: 10, esName: "Ester" },
  { num: 18, key: "job", chapters: 42, esName: "Job" },
  { num: 19, key: "psalms", chapters: 150, esName: "Salmos" },
  { num: 20, key: "proverbs", chapters: 31, esName: "Proverbios" },
  { num: 21, key: "ecclesiastes", chapters: 12, esName: "Eclesiastés" },
  { num: 22, key: "songofsolomon", chapters: 8, esName: "Cantares" },
  { num: 23, key: "isaiah", chapters: 66, esName: "Isaías" },
  { num: 24, key: "jeremiah", chapters: 52, esName: "Jeremías" },
  { num: 25, key: "lamentations", chapters: 5, esName: "Lamentaciones" },
  { num: 26, key: "ezekiel", chapters: 48, esName: "Ezequiel" },
  { num: 27, key: "daniel", chapters: 12, esName: "Daniel" },
  { num: 28, key: "hosea", chapters: 14, esName: "Oseas" },
  { num: 29, key: "joel", chapters: 3, esName: "Joel" },
  { num: 30, key: "amos", chapters: 9, esName: "Amós" },
  { num: 31, key: "obadiah", chapters: 1, esName: "Abdías" },
  { num: 32, key: "jonah", chapters: 4, esName: "Jonás" },
  { num: 33, key: "micah", chapters: 7, esName: "Miqueas" },
  { num: 34, key: "nahum", chapters: 3, esName: "Nahúm" },
  { num: 35, key: "habakkuk", chapters: 3, esName: "Habacuc" },
  { num: 36, key: "zephaniah", chapters: 3, esName: "Sofonías" },
  { num: 37, key: "haggai", chapters: 2, esName: "Hageo" },
  { num: 38, key: "zechariah", chapters: 14, esName: "Zacarías" },
  { num: 39, key: "malachi", chapters: 4, esName: "Malaquías" },
  { num: 40, key: "matthew", chapters: 28, esName: "Mateo" },
  { num: 41, key: "mark", chapters: 16, esName: "Marcos" },
  { num: 42, key: "luke", chapters: 24, esName: "Lucas" },
  { num: 43, key: "john", chapters: 21, esName: "Juan" },
  { num: 44, key: "acts", chapters: 28, esName: "Hechos" },
  { num: 45, key: "romans", chapters: 16, esName: "Romanos" },
  { num: 46, key: "1corinthians", chapters: 16, esName: "1 Corintios" },
  { num: 47, key: "2corinthians", chapters: 13, esName: "2 Corintios" },
  { num: 48, key: "galatians", chapters: 6, esName: "Gálatas" },
  { num: 49, key: "ephesians", chapters: 6, esName: "Efesios" },
  { num: 50, key: "philippians", chapters: 4, esName: "Filipenses" },
  { num: 51, key: "colossians", chapters: 4, esName: "Colosenses" },
  { num: 52, key: "1thessalonians", chapters: 5, esName: "1 Tesalonicenses" },
  { num: 53, key: "2thessalonians", chapters: 3, esName: "2 Tesalonicenses" },
  { num: 54, key: "1timothy", chapters: 6, esName: "1 Timoteo" },
  { num: 55, key: "2timothy", chapters: 4, esName: "2 Timoteo" },
  { num: 56, key: "titus", chapters: 3, esName: "Tito" },
  { num: 57, key: "philemon", chapters: 1, esName: "Filemón" },
  { num: 58, key: "hebrews", chapters: 13, esName: "Hebreos" },
  { num: 59, key: "james", chapters: 5, esName: "Santiago" },
  { num: 60, key: "1peter", chapters: 5, esName: "1 Pedro" },
  { num: 61, key: "2peter", chapters: 3, esName: "2 Pedro" },
  { num: 62, key: "1john", chapters: 5, esName: "1 Juan" },
  { num: 63, key: "2john", chapters: 1, esName: "2 Juan" },
  { num: 64, key: "3john", chapters: 1, esName: "3 Juan" },
  { num: 65, key: "jude", chapters: 1, esName: "Judas" },
  { num: 66, key: "revelation", chapters: 22, esName: "Apocalipsis" },
];

const SPANISH_BOOKS_BY_NAME = Object.fromEntries(
  BOOKS.flatMap((book) => {
    const normalized = normalize(book.esName);
    const aliases = [normalized];
    if (normalized === "cantares") aliases.push("cantares de salomon");
    if (normalized === "santiago") aliases.push("santigo");
    return aliases.map((name) => [name, book]);
  })
);

interface VerseRow {
  translation: string;
  book_key: string;
  book_order: number;
  chapter: number;
  verse: number;
  text: string;
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function cleanText(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .replace(/<S>\d+<\/S>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} -> ${response.status}`);
  const raw = await response.text();
  return raw.replace(/^\uFEFF/, "");
}

function parseThiago(jsonText: string, translation: string): VerseRow[] {
  const json = JSON.parse(jsonText);
  if (!Array.isArray(json)) return [];

  const rows: VerseRow[] = [];
  json.forEach((book: { chapters?: string[][] }, index: number) => {
    const meta = BOOKS[index];
    if (!meta) return;
    (book.chapters ?? []).forEach((chapterVerses, chapterIndex) => {
      chapterVerses.forEach((text, verseIndex) => {
        rows.push({
          translation,
          book_key: meta.key,
          book_order: meta.num,
          chapter: chapterIndex + 1,
          verse: verseIndex + 1,
          text: cleanText(String(text ?? "")),
        });
      });
    });
  });

  return rows;
}

async function fetchKjv(): Promise<VerseRow[]> {
  const jsonText = await fetchText(
    "https://raw.githubusercontent.com/bibleapi/bibleapi-bibles-json/master/kjv.json"
  );
  const json = JSON.parse(jsonText) as {
    resultset?: { row?: Array<{ field?: [number, number, number, number, string] }> };
  };

  const sourceRows = json.resultset?.row ?? [];
  return sourceRows
    .map((row) => row.field)
    .filter((field): field is [number, number, number, number, string] => Array.isArray(field) && field.length >= 5)
    .map(([, bookNum, chapter, verse, text]) => ({
      translation: "kjv",
      book_key: BOOKS[bookNum - 1].key,
      book_order: bookNum,
      chapter,
      verse,
      text: cleanText(text),
    }));
}

async function fetchAcf(): Promise<VerseRow[]> {
  const jsonText = await fetchText(
    "https://raw.githubusercontent.com/thiagobodruk/biblia/master/json/acf.json"
  );
  return parseThiago(jsonText, "acf");
}

async function fetchSpanish(): Promise<VerseRow[]> {
  const jsonText = await fetchText(
    "https://raw.githubusercontent.com/dscottpi/bibles/master/RVR1960%20-%20Spanish.json"
  );
  const json = JSON.parse(jsonText) as Record<string, Record<string, Record<string, string>>>;

  const rows: VerseRow[] = [];
  for (const [bookName, chapters] of Object.entries(json)) {
    const meta = SPANISH_BOOKS_BY_NAME[normalize(bookName)];
    if (!meta) continue;

    for (const [chapterKey, verses] of Object.entries(chapters ?? {})) {
      const chapter = Number(chapterKey);
      for (const [verseKey, text] of Object.entries(verses ?? {})) {
        rows.push({
          translation: "rvr1909",
          book_key: meta.key,
          book_order: meta.num,
          chapter,
          verse: Number(verseKey),
          text: cleanText(String(text ?? "")),
        });
      }
    }
  }

  rows.sort((a, b) => a.book_order - b.book_order || a.chapter - b.chapter || a.verse - b.verse);
  return rows;
}

// Maps Berean Bible API book IDs (USFM-style) to our internal book keys
const BSB_BOOK_ID_TO_KEY: Record<string, string> = {
  GEN: "genesis", EXO: "exodus", LEV: "leviticus", NUM: "numbers", DEU: "deuteronomy",
  JOS: "joshua", JDG: "judges", RUT: "ruth", "1SA": "1samuel", "2SA": "2samuel",
  "1KI": "1kings", "2KI": "2kings", "1CH": "1chronicles", "2CH": "2chronicles",
  EZR: "ezra", NEH: "nehemiah", EST: "esther", JOB: "job", PSA: "psalms",
  PRO: "proverbs", ECC: "ecclesiastes", SNG: "songofsolomon", ISA: "isaiah",
  JER: "jeremiah", LAM: "lamentations", EZK: "ezekiel", DAN: "daniel",
  HOS: "hosea", JOL: "joel", AMO: "amos", OBA: "obadiah", JON: "jonah",
  MIC: "micah", NAM: "nahum", HAB: "habakkuk", ZEP: "zephaniah", HAG: "haggai",
  ZEC: "zechariah", MAL: "malachi", MAT: "matthew", MRK: "mark", LUK: "luke",
  JHN: "john", ACT: "acts", ROM: "romans", "1CO": "1corinthians", "2CO": "2corinthians",
  GAL: "galatians", EPH: "ephesians", PHP: "philippians", COL: "colossians",
  "1TH": "1thessalonians", "2TH": "2thessalonians", "1TI": "1timothy", "2TI": "2timothy",
  TIT: "titus", PHM: "philemon", HEB: "hebrews", JAS: "james",
  "1PE": "1peter", "2PE": "2peter", "1JN": "1john", "2JN": "2john", "3JN": "3john",
  JUD: "jude", REV: "revelation",
};

const BOOK_KEY_TO_ORDER = Object.fromEntries(BOOKS.map((b) => [b.key, b.num]));

async function fetchBsb(): Promise<VerseRow[]> {
  const jsonText = await fetchText("https://bible.helloao.org/api/BSB/complete.json");
  const json = JSON.parse(jsonText) as {
    books?: Array<{
      id: string;
      chapters?: Array<{
        number: number;
        content?: Array<
          | { type: "verse"; number: number; content?: Array<{ text?: string } | string> }
          | { type: string }
        >;
      }>;
    }>;
  };

  const rows: VerseRow[] = [];
  for (const book of json.books ?? []) {
    const bookKey = BSB_BOOK_ID_TO_KEY[book.id];
    if (!bookKey) continue;
    const bookOrder = BOOK_KEY_TO_ORDER[bookKey];
    for (const chapter of book.chapters ?? []) {
      for (const item of chapter.content ?? []) {
        if (item.type !== "verse") continue;
        const v = item as { number: number; content?: Array<{ text?: string } | string> };
        const text = (v.content ?? [])
          .map((c) => (typeof c === "string" ? c : c.text ?? ""))
          .filter(Boolean)
          .join(" ");
        const cleaned = cleanText(text);
        if (!cleaned) continue;
        rows.push({
          translation: "bsb",
          book_key: bookKey,
          book_order: bookOrder,
          chapter: chapter.number,
          verse: v.number,
          text: cleaned,
        });
      }
    }
  }
  rows.sort((a, b) => a.book_order - b.book_order || a.chapter - b.chapter || a.verse - b.verse);
  return rows;
}

async function fetchTranslationRows(translation: string): Promise<VerseRow[]> {
  if (translation === "kjv") return fetchKjv();
  if (translation === "acf") return fetchAcf();
  if (translation === "bsb") return fetchBsb();
  return fetchSpanish();
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

    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    const { data: userRes, error: userError } = await supabase.auth.getUser(jwt);

    if (userError || !userRes?.user) {
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
    const translation = typeof body.translation === "string" ? body.translation : "";
    const force = Boolean(body.force);

    if (!["kjv", "acf", "rvr1909"].includes(translation)) {
      return new Response(
        JSON.stringify({ error: "translation must be one of: kjv, acf, rvr1909" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!force) {
      const { count } = await supabase
        .from("bible_verses")
        .select("*", { count: "exact", head: true })
        .eq("translation", translation);

      if ((count ?? 0) >= 23000) {
        return new Response(
          JSON.stringify({
            ok: true,
            translation,
            inserted: 0,
            skipped: true,
            existing: count,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const rows = await fetchTranslationRows(translation);
    if (rows.length < 23000) {
      return new Response(
        JSON.stringify({ error: "Source returned too few verses", got: rows.length }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (force) {
      const { error: deleteError } = await supabase.from("bible_verses").delete().eq("translation", translation);
      if (deleteError) {
        return new Response(JSON.stringify({ error: deleteError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const BATCH_SIZE = 1000;
    let inserted = 0;
    for (let index = 0; index < rows.length; index += BATCH_SIZE) {
      const slice = rows.slice(index, index + BATCH_SIZE);
      const { error } = await supabase.from("bible_verses").insert(slice);
      if (error) {
        return new Response(
          JSON.stringify({ error: error.message, inserted_so_far: inserted, total: rows.length }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      inserted += slice.length;
    }

    return new Response(
      JSON.stringify({ ok: true, translation, inserted, total: rows.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
