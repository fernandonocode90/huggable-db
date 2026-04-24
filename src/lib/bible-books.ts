export type Testament = "OT" | "NT";

export interface BibleBook {
  key: string;
  name: string;
  chapters: number;
  testament: Testament;
}

export const BIBLE_BOOKS: BibleBook[] = [
  { key: "genesis", name: "Genesis", chapters: 50, testament: "OT" },
  { key: "exodus", name: "Exodus", chapters: 40, testament: "OT" },
  { key: "leviticus", name: "Leviticus", chapters: 27, testament: "OT" },
  { key: "numbers", name: "Numbers", chapters: 36, testament: "OT" },
  { key: "deuteronomy", name: "Deuteronomy", chapters: 34, testament: "OT" },
  { key: "joshua", name: "Joshua", chapters: 24, testament: "OT" },
  { key: "judges", name: "Judges", chapters: 21, testament: "OT" },
  { key: "ruth", name: "Ruth", chapters: 4, testament: "OT" },
  { key: "1samuel", name: "1 Samuel", chapters: 31, testament: "OT" },
  { key: "2samuel", name: "2 Samuel", chapters: 24, testament: "OT" },
  { key: "1kings", name: "1 Kings", chapters: 22, testament: "OT" },
  { key: "2kings", name: "2 Kings", chapters: 25, testament: "OT" },
  { key: "1chronicles", name: "1 Chronicles", chapters: 29, testament: "OT" },
  { key: "2chronicles", name: "2 Chronicles", chapters: 36, testament: "OT" },
  { key: "ezra", name: "Ezra", chapters: 10, testament: "OT" },
  { key: "nehemiah", name: "Nehemiah", chapters: 13, testament: "OT" },
  { key: "esther", name: "Esther", chapters: 10, testament: "OT" },
  { key: "job", name: "Job", chapters: 42, testament: "OT" },
  { key: "psalms", name: "Psalms", chapters: 150, testament: "OT" },
  { key: "proverbs", name: "Proverbs", chapters: 31, testament: "OT" },
  { key: "ecclesiastes", name: "Ecclesiastes", chapters: 12, testament: "OT" },
  { key: "songofsolomon", name: "Song of Solomon", chapters: 8, testament: "OT" },
  { key: "isaiah", name: "Isaiah", chapters: 66, testament: "OT" },
  { key: "jeremiah", name: "Jeremiah", chapters: 52, testament: "OT" },
  { key: "lamentations", name: "Lamentations", chapters: 5, testament: "OT" },
  { key: "ezekiel", name: "Ezekiel", chapters: 48, testament: "OT" },
  { key: "daniel", name: "Daniel", chapters: 12, testament: "OT" },
  { key: "hosea", name: "Hosea", chapters: 14, testament: "OT" },
  { key: "joel", name: "Joel", chapters: 3, testament: "OT" },
  { key: "amos", name: "Amos", chapters: 9, testament: "OT" },
  { key: "obadiah", name: "Obadiah", chapters: 1, testament: "OT" },
  { key: "jonah", name: "Jonah", chapters: 4, testament: "OT" },
  { key: "micah", name: "Micah", chapters: 7, testament: "OT" },
  { key: "nahum", name: "Nahum", chapters: 3, testament: "OT" },
  { key: "habakkuk", name: "Habakkuk", chapters: 3, testament: "OT" },
  { key: "zephaniah", name: "Zephaniah", chapters: 3, testament: "OT" },
  { key: "haggai", name: "Haggai", chapters: 2, testament: "OT" },
  { key: "zechariah", name: "Zechariah", chapters: 14, testament: "OT" },
  { key: "malachi", name: "Malachi", chapters: 4, testament: "OT" },
  { key: "matthew", name: "Matthew", chapters: 28, testament: "NT" },
  { key: "mark", name: "Mark", chapters: 16, testament: "NT" },
  { key: "luke", name: "Luke", chapters: 24, testament: "NT" },
  { key: "john", name: "John", chapters: 21, testament: "NT" },
  { key: "acts", name: "Acts", chapters: 28, testament: "NT" },
  { key: "romans", name: "Romans", chapters: 16, testament: "NT" },
  { key: "1corinthians", name: "1 Corinthians", chapters: 16, testament: "NT" },
  { key: "2corinthians", name: "2 Corinthians", chapters: 13, testament: "NT" },
  { key: "galatians", name: "Galatians", chapters: 6, testament: "NT" },
  { key: "ephesians", name: "Ephesians", chapters: 6, testament: "NT" },
  { key: "philippians", name: "Philippians", chapters: 4, testament: "NT" },
  { key: "colossians", name: "Colossians", chapters: 4, testament: "NT" },
  { key: "1thessalonians", name: "1 Thessalonians", chapters: 5, testament: "NT" },
  { key: "2thessalonians", name: "2 Thessalonians", chapters: 3, testament: "NT" },
  { key: "1timothy", name: "1 Timothy", chapters: 6, testament: "NT" },
  { key: "2timothy", name: "2 Timothy", chapters: 4, testament: "NT" },
  { key: "titus", name: "Titus", chapters: 3, testament: "NT" },
  { key: "philemon", name: "Philemon", chapters: 1, testament: "NT" },
  { key: "hebrews", name: "Hebrews", chapters: 13, testament: "NT" },
  { key: "james", name: "James", chapters: 5, testament: "NT" },
  { key: "1peter", name: "1 Peter", chapters: 5, testament: "NT" },
  { key: "2peter", name: "2 Peter", chapters: 3, testament: "NT" },
  { key: "1john", name: "1 John", chapters: 5, testament: "NT" },
  { key: "2john", name: "2 John", chapters: 1, testament: "NT" },
  { key: "3john", name: "3 John", chapters: 1, testament: "NT" },
  { key: "jude", name: "Jude", chapters: 1, testament: "NT" },
  { key: "revelation", name: "Revelation", chapters: 22, testament: "NT" },
];

export const BIBLE_BOOK_BY_KEY: Record<string, BibleBook> = Object.fromEntries(
  BIBLE_BOOKS.map((b) => [b.key, b])
);

import { supabase } from "@/integrations/supabase/client";

export type SupportedTranslation = "kjv" | "acf" | "rvr1909";

export async function fetchVerseRange(opts: {
  bookKey: string;
  bookName: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number;
  translation?: SupportedTranslation;
}): Promise<{ text: string; reference: string } | null> {
  const { bookKey, bookName, chapter, verseStart, verseEnd, translation = "kjv" } = opts;
  const endVerse = verseEnd && verseEnd > verseStart ? verseEnd : verseStart;
  const range = endVerse > verseStart ? `${verseStart}-${endVerse}` : String(verseStart);
  try {
    const { data, error } = await supabase
      .from("bible_verses")
      .select("verse, text")
      .eq("translation", translation)
      .eq("book_key", bookKey)
      .eq("chapter", chapter)
      .gte("verse", verseStart)
      .lte("verse", endVerse)
      .order("verse", { ascending: true });
    if (error) throw error;
    if (!data || data.length === 0) return null;
    const text = data.map((v) => v.text.trim()).join(" ");
    const reference = `${bookName} ${chapter}:${range}`;
    return { text, reference };
  } catch {
    return null;
  }
}

export function buildReference(bookName: string, chapter: number, verseStart: number, verseEnd?: number) {
  const range = verseEnd && verseEnd > verseStart ? `${verseStart}-${verseEnd}` : String(verseStart);
  return `${bookName} ${chapter}:${range}`;
}
