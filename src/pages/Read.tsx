import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Star,
  StickyNote,
  Highlighter,
  X,
  History,
  BookmarkIcon,
  Filter,
  Share2,
} from "lucide-react";
import { AppShell } from "@/components/swc/AppShell";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { generateVerseImage, shareOrDownloadVerse } from "@/lib/verseImage";

type Book = { key: string; name: string; chapters: number; testament: "OT" | "NT" };

const BOOKS: Book[] = [
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

// PT names for Portuguese translations (used for display)
const PT_NAMES: Record<string, string> = {
  genesis: "Gênesis", exodus: "Êxodo", leviticus: "Levítico", numbers: "Números",
  deuteronomy: "Deuteronômio", joshua: "Josué", judges: "Juízes", ruth: "Rute",
  "1samuel": "1 Samuel", "2samuel": "2 Samuel", "1kings": "1 Reis", "2kings": "2 Reis",
  "1chronicles": "1 Crônicas", "2chronicles": "2 Crônicas", ezra: "Esdras",
  nehemiah: "Neemias", esther: "Ester", job: "Jó", psalms: "Salmos", proverbs: "Provérbios",
  ecclesiastes: "Eclesiastes", songofsolomon: "Cânticos", isaiah: "Isaías",
  jeremiah: "Jeremias", lamentations: "Lamentações", ezekiel: "Ezequiel",
  daniel: "Daniel", hosea: "Oséias", joel: "Joel", amos: "Amós", obadiah: "Obadias",
  jonah: "Jonas", micah: "Miquéias", nahum: "Naum", habakkuk: "Habacuque",
  zephaniah: "Sofonias", haggai: "Ageu", zechariah: "Zacarias", malachi: "Malaquias",
  matthew: "Mateus", mark: "Marcos", luke: "Lucas", john: "João", acts: "Atos",
  romans: "Romanos", "1corinthians": "1 Coríntios", "2corinthians": "2 Coríntios",
  galatians: "Gálatas", ephesians: "Efésios", philippians: "Filipenses",
  colossians: "Colossenses", "1thessalonians": "1 Tessalonicenses",
  "2thessalonians": "2 Tessalonicenses", "1timothy": "1 Timóteo", "2timothy": "2 Timóteo",
  titus: "Tito", philemon: "Filemom", hebrews: "Hebreus", james: "Tiago",
  "1peter": "1 Pedro", "2peter": "2 Pedro", "1john": "1 João", "2john": "2 João",
  "3john": "3 João", jude: "Judas", revelation: "Apocalipse",
};

// ES names for Spanish translation (used for display)
const ES_NAMES: Record<string, string> = {
  genesis: "Génesis", exodus: "Éxodo", leviticus: "Levítico", numbers: "Números",
  deuteronomy: "Deuteronomio", joshua: "Josué", judges: "Jueces", ruth: "Rut",
  "1samuel": "1 Samuel", "2samuel": "2 Samuel", "1kings": "1 Reyes", "2kings": "2 Reyes",
  "1chronicles": "1 Crónicas", "2chronicles": "2 Crónicas", ezra: "Esdras",
  nehemiah: "Nehemías", esther: "Ester", job: "Job", psalms: "Salmos", proverbs: "Proverbios",
  ecclesiastes: "Eclesiastés", songofsolomon: "Cantares", isaiah: "Isaías",
  jeremiah: "Jeremías", lamentations: "Lamentaciones", ezekiel: "Ezequiel",
  daniel: "Daniel", hosea: "Oseas", joel: "Joel", amos: "Amós", obadiah: "Abdías",
  jonah: "Jonás", micah: "Miqueas", nahum: "Nahúm", habakkuk: "Habacuc",
  zephaniah: "Sofonías", haggai: "Hageo", zechariah: "Zacarías", malachi: "Malaquías",
  matthew: "Mateo", mark: "Marcos", luke: "Lucas", john: "Juan", acts: "Hechos",
  romans: "Romanos", "1corinthians": "1 Corintios", "2corinthians": "2 Corintios",
  galatians: "Gálatas", ephesians: "Efesios", philippians: "Filipenses",
  colossians: "Colosenses", "1thessalonians": "1 Tesalonicenses",
  "2thessalonians": "2 Tesalonicenses", "1timothy": "1 Timoteo", "2timothy": "2 Timoteo",
  titus: "Tito", philemon: "Filemón", hebrews: "Hebreos", james: "Santiago",
  "1peter": "1 Pedro", "2peter": "2 Pedro", "1john": "1 Juan", "2john": "2 Juan",
  "3john": "3 Juan", jude: "Judas", revelation: "Apocalipsis",
};

const OT_BOOKS = BOOKS.filter((b) => b.testament === "OT");
const NT_BOOKS = BOOKS.filter((b) => b.testament === "NT");

type Translation = "bsb" | "kjv";

const TRANSLATIONS: { value: Translation; label: string; lang: string; ttsLang: string }[] = [
  { value: "bsb", label: "BSB (English)", lang: "en", ttsLang: "en-US" },
  { value: "kjv", label: "KJV (English)", lang: "en", ttsLang: "en-US" },
];

interface Verse {
  verse: number;
  text: string;
}

interface Bookmark {
  id: string;
  translation: string;
  book_key: string;
  book_name: string;
  chapter: number;
  verse: number;
  verse_text: string | null;
  is_favorite: boolean;
  highlight_color: string | null;
  note: string | null;
}

const FONT_SIZES = [14, 16, 18, 20, 22, 24];

const HIGHLIGHT_COLORS = [
  { name: "yellow", value: "hsl(48 95% 60% / 0.28)" },
  { name: "green", value: "hsl(142 70% 55% / 0.28)" },
  { name: "blue", value: "hsl(210 90% 65% / 0.28)" },
  { name: "pink", value: "hsl(330 80% 65% / 0.28)" },
];

function bookDisplayName(book: Book, translation: Translation) {
  if (translation === "bsb" || translation === "kjv") return book.name;
  if (translation === "rvr1909") return ES_NAMES[book.key] ?? book.name;
  return PT_NAMES[book.key] ?? book.name;
}

const Read = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { theme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();

  const [translation, setTranslation] = useState<Translation>("bsb");
  const [bookKey, setBookKey] = useState("proverbs");
  const [chapter, setChapter] = useState(3);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  // Until the user's saved reading position has been loaded, we don't render
  // chapter content — otherwise the screen would briefly show the default
  // (Proverbs 3) before snapping to the real last position (e.g. Genesis 1).
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [fontIdx, setFontIdx] = useState(2);

  const [bookmarks, setBookmarks] = useState<Record<number, Bookmark>>({});
  const [activeVerse, setActiveVerse] = useState<Verse | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [allBookmarks, setAllBookmarks] = useState<Bookmark[]>([]);
  const [libraryScope, setLibraryScope] = useState<"all" | "book">("all");
  const [libraryTab, setLibraryTab] = useState<"all" | "favorites" | "highlights" | "notes">("all");
  const [pendingVerse, setPendingVerse] = useState<number | null>(null);
  const [flashVerse, setFlashVerse] = useState<number | null>(null);
  const [bookSearchResults, setBookSearchResults] = useState<
    { chapter: number; verse: number; text: string }[]
  >([]);
  const [bookSearching, setBookSearching] = useState(false);
  const [bookSearchProgress, setBookSearchProgress] = useState(0);
  const [searchScope, setSearchScope] = useState<"book" | "all">("book");
  const [allBibleResults, setAllBibleResults] = useState<
    { book_key: string; chapter: number; verse: number; text: string }[]
  >([]);
  const [allBibleSearching, setAllBibleSearching] = useState(false);
  const [resumeOption, setResumeOption] = useState<{
    translation: Translation;
    book_key: string;
    chapter: number;
    verse: number;
  } | null>(null);

  const book = BOOKS.find((b) => b.key === bookKey)!;

  // History tracking refs
  const historyLoadedRef = useRef(false);
  const userNavigatedRef = useRef(false);
  const visibleVerseRef = useRef<number>(1);
  const [pendingResumeVerse, setPendingResumeVerse] = useState<number | null>(null);
  const [sharingVerse, setSharingVerse] = useState(false);

  // Two-tier cache:
  //  - In-memory Map (instant, lives during session)
  //  - localStorage (survives reloads; capped to ~50 chapters via LRU)
  const chapterCacheRef = useState(() => new Map<string, Verse[]>())[0];

  const lsKey = (t: Translation, bk: string, ch: number) => `bv:${t}:${bk}:${ch}`;
  const LS_INDEX_KEY = "bv:index";
  const LS_MAX = 50;

  const readLS = (t: Translation, bk: string, ch: number): Verse[] | null => {
    try {
      const raw = localStorage.getItem(lsKey(t, bk, ch));
      if (!raw) return null;
      return JSON.parse(raw) as Verse[];
    } catch {
      return null;
    }
  };

  const writeLS = (t: Translation, bk: string, ch: number, vs: Verse[]) => {
    try {
      const k = lsKey(t, bk, ch);
      localStorage.setItem(k, JSON.stringify(vs));
      const idxRaw = localStorage.getItem(LS_INDEX_KEY);
      const idx: string[] = idxRaw ? JSON.parse(idxRaw) : [];
      const next = [k, ...idx.filter((x) => x !== k)].slice(0, LS_MAX);
      localStorage.setItem(LS_INDEX_KEY, JSON.stringify(next));
      // Evict any keys beyond the cap
      idx.slice(LS_MAX - 1).forEach((old) => {
        if (!next.includes(old)) localStorage.removeItem(old);
      });
    } catch {
      // quota exceeded — ignore silently
    }
  };

  const fetchChapterVerses = async (
    t: Translation,
    bk: string,
    ch: number
  ): Promise<Verse[]> => {
    const cacheKey = `${t}:${bk}:${ch}`;
    const cached = chapterCacheRef.get(cacheKey);
    if (cached) return cached;
    const ls = readLS(t, bk, ch);
    if (ls && ls.length > 0) {
      chapterCacheRef.set(cacheKey, ls);
      return ls;
    }
    try {
      const { data, error } = await supabase
        .from("bible_verses")
        .select("verse, text")
        .eq("translation", t)
        .eq("book_key", bk)
        .eq("chapter", ch)
        .order("verse", { ascending: true });
      if (error) throw error;
      const vs: Verse[] = (data ?? []).map((r) => ({ verse: r.verse, text: r.text }));
      chapterCacheRef.set(cacheKey, vs);
      if (vs.length > 0) writeLS(t, bk, ch, vs);
      return vs;
    } catch {
      return [];
    }
  };

  // Prefetch a chapter silently in the background (next chapter)
  const prefetchChapter = (t: Translation, bk: string, ch: number) => {
    const cacheKey = `${t}:${bk}:${ch}`;
    if (chapterCacheRef.has(cacheKey)) return;
    if (readLS(t, bk, ch)) return;
    // fire and forget
    void fetchChapterVerses(t, bk, ch);
  };

  // Load reading history once on mount. If the user has prior history AND
  // hasn't already been redirected by a deep link, jump straight back to
  // where they last were — that's what "Read" should feel like.
  useEffect(() => {
    if (!user) {
      historyLoadedRef.current = true;
      setHistoryLoaded(true);
      return;
    }
    supabase
      .from("bible_reading_history")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const resumeData = {
            translation: "kjv" as Translation,
            book_key: data.book_key,
            chapter: data.chapter,
            verse: (data as { verse?: number }).verse ?? 1,
          };
          setResumeOption(resumeData);
          // Auto-resume only if the user hasn't navigated yet (e.g. via a
          // deep link from a devotional). We do NOT mark this as a user
          // navigation, so it won't re-trigger a save.
          if (!userNavigatedRef.current) {
            if (BOOKS.some((b) => b.key === resumeData.book_key)) {
              setBookKey(resumeData.book_key);
              setChapter(resumeData.chapter);
              if (resumeData.verse > 1) setPendingVerse(resumeData.verse);
            }
          }
        }
        historyLoadedRef.current = true;
        setHistoryLoaded(true);
      });
  }, [user]);

  // Apply ?book=&chapter=&verse=&translation= deep links (from devotional, etc.)
  useEffect(() => {
    const qBook = searchParams.get("book");
    const qChapter = searchParams.get("chapter");
    const qVerse = searchParams.get("verse");
    const qTranslation = searchParams.get("translation") as Translation | null;
    if (!qBook && !qChapter && !qVerse && !qTranslation) return;
    // A deep link IS an intentional navigation — allow it to be persisted.
    userNavigatedRef.current = true;
    // Translation locked to kjv for now; ignore qTranslation
    void qTranslation;
    if (qBook && BOOKS.some((b) => b.key === qBook)) {
      setBookKey(qBook);
    }
    if (qChapter) {
      const c = Number(qChapter);
      if (Number.isInteger(c) && c >= 1) setChapter(c);
    }
    if (qVerse) {
      const v = Number(qVerse);
      if (Number.isInteger(v) && v >= 1) setPendingVerse(v);
    }
    // clear params after applying so back/forward doesn't re-trigger
    const next = new URLSearchParams(searchParams);
    ["book", "chapter", "verse", "translation"].forEach((k) => next.delete(k));
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch chapter
  useEffect(() => {
    // Wait until we know whether the user has saved history — otherwise we
    // would fetch the default chapter, then re-fetch the resumed one,
    // causing a visible flash of the wrong content.
    if (!historyLoaded) return;
    setLoading(true);
    if (pendingVerse == null) {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
    (async () => {
      const vs = await fetchChapterVerses(translation, bookKey, chapter);
      setVerses(vs);
      setReference(`${bookDisplayName(book, translation)} ${chapter}`);
      setLoading(false);
      if (pendingVerse == null) {
        window.scrollTo({ top: 0, behavior: "auto" });
      }
      // Prefetch next chapter (or first chapter of next book) silently.
      setTimeout(() => {
        if (chapter < book.chapters) {
          prefetchChapter(translation, bookKey, chapter + 1);
        } else {
          const idx = BOOKS.findIndex((b) => b.key === bookKey);
          const nextBook = BOOKS[idx + 1];
          if (nextBook) prefetchChapter(translation, nextBook.key, 1);
        }
      }, 600);
    })();
  }, [bookKey, chapter, translation, book, historyLoaded]);

  // Scroll to and flash a verse after it loads (e.g. coming from My Library)
  useEffect(() => {
    if (pendingVerse == null || loading || verses.length === 0) return;
    const target = pendingVerse;
    const t = setTimeout(() => {
      const el = document.getElementById(`verse-${target}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setFlashVerse(target);
        setTimeout(() => setFlashVerse(null), 2200);
      }
      setPendingVerse(null);
    }, 80);
    return () => clearTimeout(t);
  }, [pendingVerse, loading, verses]);

  // Save reading history — only after the initial history load AND after a
  // real user navigation. This prevents the very first render from
  // overwriting saved history with the default (Proverbs 3, verse 1).
  const saveHistory = (verseToSave: number) => {
    if (!user) return;
    const bk = BOOKS.find((b) => b.key === bookKey);
    if (!bk) return;
    supabase
      .from("bible_reading_history")
      .upsert({
        user_id: user.id,
        translation,
        book_key: bookKey,
        book_name: bk.name, // canonical English; UI re-localizes via book_key
        chapter,
        verse: verseToSave,
        last_read_at: new Date().toISOString(),
      })
      .then(({ error }) => {
        if (!error) {
          // Refresh local state so the resume card reflects latest position.
          setResumeOption({
            translation,
            book_key: bookKey,
            chapter,
            verse: verseToSave,
          });
        }
      });
  };

  // Debounced save when location changes (translation/book/chapter)
  useEffect(() => {
    if (!user) return;
    if (!historyLoadedRef.current || !userNavigatedRef.current) return;
    const t = setTimeout(() => {
      // Reset visible verse to 1 because chapter just changed; scroll handler
      // will update it shortly, but save now so we don't lose this navigation.
      saveHistory(1);
      visibleVerseRef.current = 1;
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, translation, bookKey, chapter]);

  // Persist last visible verse on tab hide / unload so the user really
  // resumes where they stopped scrolling.
  useEffect(() => {
    if (!user) return;
    const flush = () => {
      if (!historyLoadedRef.current || !userNavigatedRef.current) return;
      saveHistory(visibleVerseRef.current || 1);
    };
    const onVis = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, translation, bookKey, chapter]);

  // Load bookmarks for current chapter
  const loadChapterBookmarks = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("bible_bookmarks")
      .select("*")
      .eq("user_id", user.id)
      .eq("translation", translation)
      .eq("book_key", bookKey)
      .eq("chapter", chapter);
    const map: Record<number, Bookmark> = {};
    (data ?? []).forEach((b) => {
      map[b.verse] = b as Bookmark;
    });
    setBookmarks(map);
  };

  useEffect(() => {
    loadChapterBookmarks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, translation, bookKey, chapter]);

  const upsertBookmark = async (
    verse: Verse,
    patch: Partial<Pick<Bookmark, "is_favorite" | "highlight_color" | "note">>
  ) => {
    if (!user) {
      toast({ title: "Please sign in", description: "Sign in to save bookmarks." });
      return;
    }
    const existing = bookmarks[verse.verse];
    const merged = {
      user_id: user.id,
      translation,
      book_key: bookKey,
      book_name: bookDisplayName(book, translation),
      chapter,
      verse: verse.verse,
      verse_text: verse.text.trim(),
      is_favorite: existing?.is_favorite ?? false,
      highlight_color: existing?.highlight_color ?? null,
      note: existing?.note ?? null,
      ...patch,
    };

    // If everything is empty after merge, delete it
    if (!merged.is_favorite && !merged.highlight_color && !merged.note) {
      if (existing) {
        await supabase.from("bible_bookmarks").delete().eq("id", existing.id);
      }
      const next = { ...bookmarks };
      delete next[verse.verse];
      setBookmarks(next);
      return;
    }

    const { data, error } = await supabase
      .from("bible_bookmarks")
      .upsert(merged, { onConflict: "user_id,translation,book_key,chapter,verse" })
      .select()
      .single();
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    setBookmarks({ ...bookmarks, [verse.verse]: data as Bookmark });
  };

  const openLibrary = async () => {
    setLibraryOpen(true);
    if (!user) return;
    const { data } = await supabase
      .from("bible_bookmarks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setAllBookmarks((data ?? []) as Bookmark[]);
  };

  const jumpTo = (b: Bookmark) => {
    setTranslation(b.translation as Translation);
    setBookKey(b.book_key);
    setChapter(b.chapter);
    setPendingVerse(b.verse);
    setLibraryOpen(false);
    setSearchOpen(false);
  };

  // Search filter
  const filteredBookmarks = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return allBookmarks;
    return allBookmarks.filter(
      (b) =>
        b.verse_text?.toLowerCase().includes(q) ||
        b.note?.toLowerCase().includes(q) ||
        `${b.book_name} ${b.chapter}:${b.verse}`.toLowerCase().includes(q)
    );
  }, [allBookmarks, searchQuery]);

  // Whole-book search: triggered while the search sheet is open and query >= 2 chars.
  // Single ILIKE query against the local bible_verses table.
  useEffect(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!searchOpen || q.length < 2 || searchScope !== "book") {
      setBookSearchResults([]);
      setBookSearching(false);
      setBookSearchProgress(0);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(async () => {
      setBookSearching(true);
      setBookSearchProgress(0);
      const escaped = q.replace(/[\\%_]/g, (m) => `\\${m}`);
      const { data } = await supabase
        .from("bible_verses")
        .select("chapter, verse, text")
        .eq("translation", translation)
        .eq("book_key", bookKey)
        .ilike("text", `%${escaped}%`)
        .order("chapter", { ascending: true })
        .order("verse", { ascending: true })
        .limit(500);
      if (cancelled) return;
      const matches = (data ?? []).map((r) => ({
        chapter: r.chapter,
        verse: r.verse,
        text: r.text,
      }));
      setBookSearchResults(matches);
      setBookSearchProgress(book.chapters);
      if (!cancelled) setBookSearching(false);
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [searchQuery, searchOpen, translation, bookKey, book.chapters, searchScope]);

  // Whole-Bible search: same translation, all books. Capped at 200 results.
  useEffect(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!searchOpen || q.length < 2 || searchScope !== "all") {
      setAllBibleResults([]);
      setAllBibleSearching(false);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(async () => {
      setAllBibleSearching(true);
      const escaped = q.replace(/[\\%_]/g, (m) => `\\${m}`);
      const { data } = await supabase
        .from("bible_verses")
        .select("book_key, chapter, verse, text, book_order")
        .eq("translation", translation)
        .ilike("text", `%${escaped}%`)
        .order("book_order", { ascending: true })
        .order("chapter", { ascending: true })
        .order("verse", { ascending: true })
        .limit(200);
      if (cancelled) return;
      setAllBibleResults(
        (data ?? []).map((r) => ({
          book_key: r.book_key,
          chapter: r.chapter,
          verse: r.verse,
          text: r.text,
        })),
      );
      setAllBibleSearching(false);
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [searchQuery, searchOpen, translation, searchScope]);

  const openSearch = async () => {
    setSearchOpen(true);
    if (allBookmarks.length === 0 && user) {
      const { data } = await supabase
        .from("bible_bookmarks")
        .select("*")
        .eq("user_id", user.id);
      setAllBookmarks((data ?? []) as Bookmark[]);
    }
  };

  const prevChapter = () => {
    userNavigatedRef.current = true;
    setChapter((c) => Math.max(1, c - 1));
  };
  const nextChapter = () => {
    userNavigatedRef.current = true;
    setChapter((c) => Math.min(book.chapters, c + 1));
  };

  // Track the verse currently most visible on screen, so we can save the
  // user's exact reading position (not just the chapter).
  useEffect(() => {
    if (verses.length === 0) return;
    visibleVerseRef.current = pendingVerse ?? 1;
    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the entry with the largest intersection ratio that's actually visible
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const id = (visible.target as HTMLElement).id; // verse-N
        const n = Number(id.replace("verse-", ""));
        if (Number.isInteger(n) && n > 0) {
          visibleVerseRef.current = n;
        }
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    verses.forEach((v) => {
      const el = document.getElementById(`verse-${v.verse}`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [verses, pendingVerse]);

  return (
    <AppShell>
      <header className="animate-fade-up flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
            The Full Bible
          </p>
          <h1 className="mt-2 font-display text-4xl">
            <span className="gold-text">Sacred</span>{" "}
            <span className="text-foreground">Reading</span>
          </h1>
        </div>
        <div className="flex gap-1.5">
          <Button variant="outline" size="icon" onClick={openSearch} aria-label="Search">
            <Search className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={openLibrary} aria-label="My Library">
            <BookmarkIcon className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {historyLoaded && (
      <div className="mt-5 flex gap-2 animate-fade-up">
        <Select
          value={bookKey}
          onValueChange={(v) => {
            userNavigatedRef.current = true;
            setBookKey(v);
            setChapter(1);
          }}
        >
          <SelectTrigger className="flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-80">
            <div className="px-2 py-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {translation === "kjv"
                ? "Old Testament"
                : translation === "rvr1909"
                ? "Antiguo Testamento"
                : "Antigo Testamento"}
            </div>
            {OT_BOOKS.map((b) => (
              <SelectItem key={b.key} value={b.key}>
                {bookDisplayName(b, translation)}
              </SelectItem>
            ))}
            <div className="mt-1 px-2 py-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {translation === "kjv"
                ? "New Testament"
                : translation === "rvr1909"
                ? "Nuevo Testamento"
                : "Novo Testamento"}
            </div>
            {NT_BOOKS.map((b) => (
              <SelectItem key={b.key} value={b.key}>
                {bookDisplayName(b, translation)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={String(chapter)}
          onValueChange={(v) => {
            userNavigatedRef.current = true;
            setChapter(Number(v));
          }}
        >
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {Array.from({ length: book.chapters }, (_, i) => i + 1).map((c) => (
              <SelectItem key={c} value={String(c)}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      )}

      {historyLoaded && (
      <div className="mt-3 flex items-center justify-between gap-2 animate-fade-up">
        <div
          role="radiogroup"
          aria-label="Reading text size"
          className="inline-flex items-center gap-1 rounded-full bg-background/40 p-1 ring-1 ring-border/60"
        >
          {[
            { label: "S", idx: 0 },
            { label: "M", idx: 2 },
            { label: "L", idx: 3 },
            { label: "XL", idx: 5 },
          ].map(({ label, idx }) => {
            const active = fontIdx === idx;
            return (
              <button
                key={label}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setFontIdx(idx)}
                className={`min-w-[36px] rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.4)]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" onClick={prevChapter} disabled={chapter === 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={nextChapter}
            disabled={chapter === book.chapters}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      )}

      <article
        className="glass-card mt-5 rounded-3xl p-6 animate-fade-up"
        style={{ fontSize: FONT_SIZES[fontIdx] }}
      >
        <h2 className="font-display text-2xl text-foreground mb-4 min-h-[2rem]">
          {historyLoaded ? reference : ""}
        </h2>
        {loading && (
          <div className="space-y-3" aria-label="Loading chapter">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-11/12" />
                <Skeleton className="h-3.5 w-4/5" />
              </div>
            ))}
          </div>
        )}
        {!loading && verses.length === 0 && (
          <p className="text-sm text-muted-foreground">Could not load this chapter.</p>
        )}
        <div className="space-y-3 leading-relaxed text-foreground/90 font-display">
          {verses.map((v) => {
            const bm = bookmarks[v.verse];
            const bgStyle = bm?.highlight_color
              ? { backgroundColor: bm.highlight_color }
              : undefined;
            const isFlash = flashVerse === v.verse;
            return (
              <div key={v.verse} id={`verse-${v.verse}`} className="group scroll-mt-24">
                <p
                  onClick={() => setActiveVerse(v)}
                  className={`cursor-pointer rounded-md px-1 -mx-1 py-0.5 transition-shadow duration-500 ${
                    isFlash ? "ring-2 ring-primary/70 shadow-[0_0_20px_hsl(var(--primary)/0.35)]" : ""
                  }`}
                  style={bgStyle}
                >
                  <sup className="mr-1.5 text-xs font-semibold text-primary">{v.verse}</sup>
                  {v.text.trim()}
                  {bm?.is_favorite && (
                    <Star className="inline-block ml-1.5 h-3.5 w-3.5 -mt-1 fill-primary text-primary" />
                  )}
                </p>
                {bm?.note && (
                  <div className="ml-4 mt-1 mb-2 rounded-lg border-l-2 border-primary/60 bg-accent/20 px-3 py-1.5 text-xs text-muted-foreground">
                    <StickyNote className="inline h-3 w-3 mr-1 -mt-0.5 text-primary" />
                    {bm.note}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </article>

      {!loading && verses.length > 0 && (
        <div className="mt-4 flex items-center justify-between gap-2 animate-fade-up">
          <Button
            variant="outline"
            onClick={prevChapter}
            disabled={chapter === 1}
            className="flex-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            onClick={nextChapter}
            disabled={chapter === book.chapters}
            className="flex-1"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Translation attribution */}
      {!loading && verses.length > 0 && translation === "bsb" && (
        <p className="mt-6 text-center text-[11px] leading-relaxed text-muted-foreground/80">
          Scripture quotations from the{" "}
          <a
            href="https://berean.bible"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Berean Standard Bible
          </a>
          . Public Domain — free to use, copy and share.
        </p>
      )}

      {/* Verse action sheet */}
      <Sheet open={!!activeVerse} onOpenChange={(o) => !o && setActiveVerse(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle className="text-left">
              Verse {activeVerse?.verse} — {bookDisplayName(book, translation)} {chapter}
            </SheetTitle>
            <SheetDescription className="sr-only">
              Actions for the selected verse: copy, share, highlight or add a note.
            </SheetDescription>
          </SheetHeader>
          {activeVerse && (
            <>
              <p className="mt-3 text-sm text-muted-foreground italic">
                "{activeVerse.text.trim()}"
              </p>

              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
                    Favorite
                  </p>
                  <Button
                    variant={bookmarks[activeVerse.verse]?.is_favorite ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      upsertBookmark(activeVerse, {
                        is_favorite: !bookmarks[activeVerse.verse]?.is_favorite,
                      })
                    }
                  >
                    <Star
                      className={`h-4 w-4 ${
                        bookmarks[activeVerse.verse]?.is_favorite ? "fill-current" : ""
                      }`}
                    />
                    {bookmarks[activeVerse.verse]?.is_favorite ? "Favorited" : "Add to favorites"}
                  </Button>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
                    Highlight
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {HIGHLIGHT_COLORS.map((c) => {
                      const active =
                        bookmarks[activeVerse.verse]?.highlight_color === c.value;
                      return (
                        <button
                          key={c.name}
                          onClick={() =>
                            upsertBookmark(activeVerse, {
                              highlight_color: active ? null : c.value,
                            })
                          }
                          className={`h-9 w-9 rounded-full border-2 transition-all ${
                            active ? "border-primary scale-110" : "border-border"
                          }`}
                          style={{ backgroundColor: c.value }}
                          aria-label={`Highlight ${c.name}`}
                        />
                      );
                    })}
                    {bookmarks[activeVerse.verse]?.highlight_color && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          upsertBookmark(activeVerse, { highlight_color: null })
                        }
                        aria-label="Remove highlight"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
                    Note
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setNoteText(bookmarks[activeVerse.verse]?.note ?? "");
                      setNoteOpen(true);
                    }}
                  >
                    <StickyNote className="h-4 w-4" />
                    {bookmarks[activeVerse.verse]?.note ? "Edit note" : "Add note"}
                  </Button>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
                    Share
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={sharingVerse}
                    onClick={async () => {
                      if (!activeVerse) return;
                      setSharingVerse(true);
                      try {
                        const ref = `${bookDisplayName(book, translation)} ${chapter}:${activeVerse.verse}`;
                        const trLabel =
                          TRANSLATIONS.find((t) => t.value === translation)?.label.split(" ")[0] ?? translation.toUpperCase();
                        const blob = await generateVerseImage({
                          reference: ref,
                          text: activeVerse.text,
                          translation: trLabel,
                          theme,
                        });
                        const filename = `${ref.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`;
                        const result = await shareOrDownloadVerse(blob, filename);
                        toast({
                          title:
                            result === "shared"
                              ? "Verse shared"
                              : "Verse image downloaded",
                        });
                      } catch (err) {
                        toast({
                          title: "Couldn't create image",
                          description: (err as Error).message,
                          variant: "destructive",
                        });
                      } finally {
                        setSharingVerse(false);
                      }
                    }}
                  >
                    <Share2 className="h-4 w-4" />
                    {sharingVerse ? "Creating image…" : "Share as image"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Note dialog */}
      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Personal note</DialogTitle>
          </DialogHeader>
          <Textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Write your reflection..."
            className="min-h-32"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNoteOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!activeVerse) return;
                await upsertBookmark(activeVerse, { note: noteText.trim() || null });
                setNoteOpen(false);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Search sheet */}
      <Sheet open={searchOpen} onOpenChange={setSearchOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-left">Search</SheetTitle>
            <SheetDescription className="sr-only">
              Search any word or phrase in the Bible.
            </SheetDescription>
          </SheetHeader>
          <Input
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              searchScope === "all"
                ? "Search the whole Bible, favorites, notes..."
                : `Search in ${bookDisplayName(book, translation)}, favorites, notes...`
            }
            className="mt-4"
          />
          <div className="mt-3 flex rounded-lg bg-muted p-1 text-xs">
            <button
              type="button"
              onClick={() => setSearchScope("book")}
              className={`flex-1 rounded-md px-3 py-1.5 transition-colors ${
                searchScope === "book"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              {bookDisplayName(book, translation)}
            </button>
            <button
              type="button"
              onClick={() => setSearchScope("all")}
              className={`flex-1 rounded-md px-3 py-1.5 transition-colors ${
                searchScope === "all"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              Whole Bible
            </button>
          </div>
          <div className="mt-4 space-y-4">
            {searchQuery && searchScope === "book" &&
              (bookSearching || bookSearchResults.length > 0) && (
              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    In {bookDisplayName(book, translation)} ({bookSearchResults.length})
                  </p>
                  {bookSearching && (
                    <p className="text-[10px] text-muted-foreground">
                      Scanning {bookSearchProgress}/{book.chapters}…
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  {bookSearchResults.map((r) => (
                    <button
                      key={`${r.chapter}-${r.verse}`}
                      onClick={() => {
                        setPendingVerse(r.verse);
                        setChapter(r.chapter);
                        setSearchOpen(false);
                      }}
                      className="block w-full text-left rounded-lg bg-accent/20 p-2.5 text-sm hover:bg-accent/40 transition-colors"
                    >
                      <p className="text-xs text-primary font-semibold">
                        {bookDisplayName(book, translation)} {r.chapter}:{r.verse}
                      </p>
                      <p className="text-foreground/80 mt-0.5 line-clamp-2">{r.text.trim()}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {searchQuery && searchScope === "all" &&
              (allBibleSearching || allBibleResults.length > 0) && (
              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Across the Bible ({allBibleResults.length})
                  </p>
                  {allBibleSearching && (
                    <p className="text-[10px] text-muted-foreground">Searching…</p>
                  )}
                </div>
                <div className="space-y-2">
                  {allBibleResults.map((r) => {
                    const b = BOOKS.find((bk) => bk.key === r.book_key);
                    const name = b ? bookDisplayName(b, translation) : r.book_key;
                    return (
                      <button
                        key={`${r.book_key}-${r.chapter}-${r.verse}`}
                        onClick={() => {
                          userNavigatedRef.current = true;
                          setBookKey(r.book_key);
                          setChapter(r.chapter);
                          setPendingVerse(r.verse);
                          setSearchOpen(false);
                        }}
                        className="block w-full text-left rounded-lg bg-accent/20 p-2.5 text-sm hover:bg-accent/40 transition-colors"
                      >
                        <p className="text-xs text-primary font-semibold">
                          {name} {r.chapter}:{r.verse}
                        </p>
                        <p className="text-foreground/80 mt-0.5 line-clamp-2">
                          {r.text.trim()}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {searchQuery && filteredBookmarks.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
                  In your library ({filteredBookmarks.length})
                </p>
                <div className="space-y-2">
                  {filteredBookmarks.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => jumpTo(b)}
                      className="block w-full text-left rounded-lg bg-accent/20 p-2.5 text-sm hover:bg-accent/40 transition-colors"
                    >
                      <p className="text-xs text-primary font-semibold">
                        {b.book_name} {b.chapter}:{b.verse}
                      </p>
                      <p className="text-foreground/80 mt-0.5 line-clamp-2">{b.verse_text}</p>
                      {b.note && (
                        <p className="text-muted-foreground mt-1 text-xs italic line-clamp-1">
                          📝 {b.note}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {searchQuery &&
              !bookSearching && !allBibleSearching &&
              bookSearchResults.length === 0 &&
              allBibleResults.length === 0 &&
              filteredBookmarks.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No results found.
                </p>
              )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Library sheet */}
      <Sheet open={libraryOpen} onOpenChange={setLibraryOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-left">My Library</SheetTitle>
            <SheetDescription className="sr-only">
              Your bookmarks, highlights and notes.
            </SheetDescription>
          </SheetHeader>
          {(() => {
            const scoped =
              libraryScope === "book"
                ? allBookmarks.filter((b) => b.book_key === bookKey)
                : allBookmarks;
            const byTab = (list: Bookmark[]) => {
              if (libraryTab === "favorites") return list.filter((b) => b.is_favorite);
              if (libraryTab === "highlights") return list.filter((b) => !!b.highlight_color);
              if (libraryTab === "notes") return list.filter((b) => !!b.note);
              return list;
            };
            const visible = byTab(scoped);
            const counts = {
              all: scoped.length,
              favorites: scoped.filter((b) => b.is_favorite).length,
              highlights: scoped.filter((b) => !!b.highlight_color).length,
              notes: scoped.filter((b) => !!b.note).length,
            };
            return (
              <>
                <div className="mt-4 flex items-center gap-2">
                  <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                  <div className="flex rounded-lg bg-muted p-1 text-xs">
                    <button
                      onClick={() => setLibraryScope("all")}
                      className={`px-3 py-1.5 rounded-md transition-colors ${
                        libraryScope === "all"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground"
                      }`}
                    >
                      All books
                    </button>
                    <button
                      onClick={() => setLibraryScope("book")}
                      className={`px-3 py-1.5 rounded-md transition-colors ${
                        libraryScope === "book"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground"
                      }`}
                    >
                      {bookDisplayName(book, translation)}
                    </button>
                  </div>
                </div>

                <Tabs
                  value={libraryTab}
                  onValueChange={(v) => setLibraryTab(v as typeof libraryTab)}
                  className="mt-3"
                >
                  <TabsList className="grid w-full grid-cols-4 h-auto">
                    <TabsTrigger value="all" className="text-xs">
                      All ({counts.all})
                    </TabsTrigger>
                    <TabsTrigger value="favorites" className="text-xs">
                      <Star className="h-3 w-3 mr-1" />
                      {counts.favorites}
                    </TabsTrigger>
                    <TabsTrigger value="highlights" className="text-xs">
                      <Highlighter className="h-3 w-3 mr-1" />
                      {counts.highlights}
                    </TabsTrigger>
                    <TabsTrigger value="notes" className="text-xs">
                      <StickyNote className="h-3 w-3 mr-1" />
                      {counts.notes}
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value={libraryTab} className="mt-4 space-y-2">
                    {visible.length === 0 && (
                      allBookmarks.length === 0 ? (
                        <div className="py-2">
                          <EmptyState
                            icon={BookmarkIcon}
                            eyebrow="Your library"
                            title="A blank page, full of promise"
                            description="Tap any verse while reading to favorite it, highlight it, or add a note. Your saved verses will live here."
                          />
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-6">
                          Nothing here yet for this filter.
                        </p>
                      )
                    )}
                    {visible.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => jumpTo(b)}
                        className="block w-full text-left rounded-xl bg-accent/20 p-3 hover:bg-accent/40 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-xs text-primary font-semibold">
                            {b.book_name} {b.chapter}:{b.verse}
                          </p>
                          <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                            {b.translation}
                          </span>
                          <div className="ml-auto flex items-center gap-1">
                            {b.is_favorite && (
                              <Star className="h-3 w-3 fill-primary text-primary" />
                            )}
                            {b.highlight_color && (
                              <Highlighter className="h-3 w-3 text-primary" />
                            )}
                            {b.note && <StickyNote className="h-3 w-3 text-primary" />}
                          </div>
                        </div>
                        <p className="text-sm text-foreground/80 line-clamp-2">{b.verse_text}</p>
                        {b.note && (
                          <p className="text-xs text-muted-foreground mt-1 italic line-clamp-1">
                            📝 {b.note}
                          </p>
                        )}
                      </button>
                    ))}
                  </TabsContent>
                </Tabs>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
};

export default Read;
