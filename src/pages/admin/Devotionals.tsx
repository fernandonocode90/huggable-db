import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Save, X, Loader2, BookOpen, Upload, FileJson } from "lucide-react";
import { BIBLE_BOOKS, BIBLE_BOOK_BY_KEY, fetchVerseRange, buildReference } from "@/lib/bible-books";

interface Devotional {
  id: string;
  day_number: number;
  verse_reference: string | null;
  verse_text: string | null;
  reflection_text: string | null;
  book_key: string | null;
  chapter: number | null;
  verse_start: number | null;
  verse_end: number | null;
  translation: string | null;
}

const Devotionals = () => {
  const { user } = useAuth();
  const [devotionals, setDevotionals] = useState<Devotional[]>([]);
  const [devBusy, setDevBusy] = useState(false);
  const [verseLoading, setVerseLoading] = useState(false);
  const [editingDevotionalId, setEditingDevotionalId] = useState<string | null>(null);
  const [devSearch, setDevSearch] = useState("");
  const [devVisible, setDevVisible] = useState(20);
  const [devForm, setDevForm] = useState({
    day_number: "",
    book_key: "",
    chapter: "",
    verse_start: "",
    verse_end: "",
    verse_text: "",
    reflection_text: "",
  });
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);

  const filteredDevotionals = useMemo(() => {
    const q = devSearch.trim().toLowerCase();
    if (!q) return devotionals;
    return devotionals.filter(
      (d) =>
        String(d.day_number).includes(q) ||
        (d.verse_reference ?? "").toLowerCase().includes(q) ||
        (d.verse_text ?? "").toLowerCase().includes(q),
    );
  }, [devotionals, devSearch]);

  useEffect(() => setDevVisible(20), [devSearch]);

  const refreshDevotionals = async () => {
    const { data } = await supabase
      .from("daily_devotionals")
      .select("id,day_number,verse_reference,verse_text,reflection_text,book_key,chapter,verse_start,verse_end,translation")
      .order("day_number", { ascending: true });
    setDevotionals(data ?? []);
  };

  useEffect(() => {
    void refreshDevotionals();
  }, []);

  const resetDevotionalForm = () => {
    setEditingDevotionalId(null);
    setDevForm({
      day_number: "",
      book_key: "",
      chapter: "",
      verse_start: "",
      verse_end: "",
      verse_text: "",
      reflection_text: "",
    });
  };

  const selectedBook = useMemo(
    () => (devForm.book_key ? BIBLE_BOOK_BY_KEY[devForm.book_key] : null),
    [devForm.book_key],
  );

  useEffect(() => {
    const { book_key, chapter, verse_start, verse_end } = devForm;
    if (!book_key || !chapter || !verse_start) return;
    const book = BIBLE_BOOK_BY_KEY[book_key];
    if (!book) return;
    const ch = Number(chapter);
    const vs = Number(verse_start);
    const ve = verse_end ? Number(verse_end) : undefined;
    if (!Number.isInteger(ch) || ch < 1 || ch > book.chapters) return;
    if (!Number.isInteger(vs) || vs < 1) return;
    if (ve !== undefined && (!Number.isInteger(ve) || ve < vs)) return;
    let cancelled = false;
    setVerseLoading(true);
    fetchVerseRange({ bookKey: book.key, bookName: book.name, chapter: ch, verseStart: vs, verseEnd: ve })
      .then((res) => {
        if (cancelled) return;
        if (res) setDevForm((f) => ({ ...f, verse_text: res.text }));
      })
      .finally(() => !cancelled && setVerseLoading(false));
    return () => {
      cancelled = true;
    };
  }, [devForm.book_key, devForm.chapter, devForm.verse_start, devForm.verse_end]);

  const submitDevotional = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!devForm.day_number) return toast.error("Enter the day number");
    const dayNum = Number(devForm.day_number);
    if (!Number.isInteger(dayNum) || dayNum < 1 || dayNum > 365) {
      return toast.error("Day number must be between 1 and 365");
    }
    if (!devForm.book_key || !devForm.chapter || !devForm.verse_start) {
      return toast.error("Pick a book, chapter and verse");
    }
    const book = BIBLE_BOOK_BY_KEY[devForm.book_key];
    if (!book) return toast.error("Invalid book");
    const chapter = Number(devForm.chapter);
    const verseStart = Number(devForm.verse_start);
    const verseEnd = devForm.verse_end ? Number(devForm.verse_end) : null;
    setDevBusy(true);
    try {
      const reference = buildReference(book.name, chapter, verseStart, verseEnd ?? undefined);
      const payload = {
        day_number: dayNum,
        verse_reference: reference,
        verse_text: devForm.verse_text || null,
        reflection_text: devForm.reflection_text || null,
        book_key: book.key,
        chapter,
        verse_start: verseStart,
        verse_end: verseEnd,
        translation: "kjv",
        created_by: user!.id,
      };
      const { error } = await supabase
        .from("daily_devotionals")
        .upsert(payload, { onConflict: "day_number" });
      if (error) throw error;
      await supabase.rpc("log_admin_action", {
        _action: editingDevotionalId ? "update_devotional" : "create_devotional",
        _entity_type: "devotional",
        _entity_id: String(dayNum),
        _metadata: { day_number: dayNum, reference },
      });
      toast.success(`Devotional for day ${dayNum} saved`);
      resetDevotionalForm();
      refreshDevotionals();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setDevBusy(false);
    }
  };

  const editDevotional = (d: Devotional) => {
    setEditingDevotionalId(d.id);
    setDevForm({
      day_number: String(d.day_number),
      book_key: d.book_key ?? "",
      chapter: d.chapter ? String(d.chapter) : "",
      verse_start: d.verse_start ? String(d.verse_start) : "",
      verse_end: d.verse_end ? String(d.verse_end) : "",
      verse_text: d.verse_text ?? "",
      reflection_text: d.reflection_text ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const removeDevotional = async (id: string, day: number) => {
    if (!confirm(`Delete the devotional for day ${day}?`)) return;
    const { error } = await supabase.from("daily_devotionals").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
    } else {
      await supabase.rpc("log_admin_action", {
        _action: "delete_devotional",
        _entity_type: "devotional",
        _entity_id: id,
        _metadata: { day_number: day },
      });
      if (editingDevotionalId === id) resetDevotionalForm();
      refreshDevotionals();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-foreground">Devotionals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          One verse and one reflection per day (1–365). Saving an existing day overwrites it.
        </p>
      </div>

      <Card className="border-border/40 bg-card/40 backdrop-blur">
        <CardContent className="p-6">
          <form onSubmit={submitDevotional} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-display text-base text-foreground">
                <BookOpen className="h-4 w-4 text-primary" />
                {editingDevotionalId ? "Edit devotional" : "New devotional"}
              </h3>
              {editingDevotionalId && (
                <button
                  type="button"
                  onClick={resetDevotionalForm}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" /> Cancel
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="space-y-1.5">
                <Label>Day # (1–365)</Label>
                <Input
                  type="number"
                  min="1"
                  max="365"
                  required
                  value={devForm.day_number}
                  onChange={(e) => setDevForm({ ...devForm, day_number: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>Book</Label>
                <Select
                  value={devForm.book_key}
                  onValueChange={(v) =>
                    setDevForm((f) => ({ ...f, book_key: v, chapter: "", verse_start: "", verse_end: "" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select book" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {BIBLE_BOOKS.map((b) => (
                      <SelectItem key={b.key} value={b.key}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Chapter</Label>
                <Select
                  value={devForm.chapter}
                  onValueChange={(v) =>
                    setDevForm((f) => ({ ...f, chapter: v, verse_start: "", verse_end: "" }))
                  }
                  disabled={!selectedBook}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedBook ? "Select chapter" : "Pick book first"} />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {selectedBook &&
                      Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map((c) => (
                        <SelectItem key={c} value={String(c)}>
                          {c}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Verse from</Label>
                <Input
                  type="number"
                  min="1"
                  value={devForm.verse_start}
                  onChange={(e) => setDevForm({ ...devForm, verse_start: e.target.value })}
                  disabled={!devForm.chapter}
                  placeholder="1"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Verse to</Label>
                <Input
                  type="number"
                  min="1"
                  value={devForm.verse_end}
                  onChange={(e) => setDevForm({ ...devForm, verse_end: e.target.value })}
                  disabled={!devForm.verse_start}
                  placeholder="(optional)"
                />
              </div>
              <div className="space-y-1.5 md:col-span-4">
                <div className="flex items-center justify-between">
                  <Label>
                    Verse of the day{" "}
                    {verseLoading && <Loader2 className="ml-1 inline h-3 w-3 animate-spin" />}
                  </Label>
                  <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Auto-filled (KJV)
                  </span>
                </div>
                <Textarea
                  rows={4}
                  value={devForm.verse_text}
                  onChange={(e) => setDevForm({ ...devForm, verse_text: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 md:col-span-4">
                <Label>Reflection of the day</Label>
                <Textarea
                  rows={5}
                  value={devForm.reflection_text}
                  onChange={(e) => setDevForm({ ...devForm, reflection_text: e.target.value })}
                />
              </div>
            </div>
            <Button type="submit" disabled={devBusy} className="w-full md:w-auto">
              <Save className="mr-2 h-4 w-4" />
              {devBusy ? "Saving..." : editingDevotionalId ? "Save changes" : "Save devotional"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/40 bg-card/40 backdrop-blur">
        <CardContent className="p-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-display text-base text-foreground">Saved devotionals</h3>
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {filteredDevotionals.length}/{devotionals.length}
            </span>
          </div>
          <Input
            placeholder="Search by day, reference…"
            value={devSearch}
            onChange={(e) => setDevSearch(e.target.value)}
            className="mb-3"
          />
          <ul className="space-y-2">
            {filteredDevotionals.slice(0, devVisible).map((d) => (
              <li
                key={d.id}
                className={`flex items-start justify-between gap-3 rounded-xl border border-border/40 bg-background/40 p-4 ${
                  editingDevotionalId === d.id ? "ring-1 ring-primary/60" : ""
                }`}
              >
                <button onClick={() => editDevotional(d)} className="min-w-0 flex-1 text-left">
                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Day {d.day_number}
                  </div>
                  <div className="truncate text-sm font-medium text-foreground">
                    {d.verse_reference || "(no reference)"}
                  </div>
                  {d.verse_text && (
                    <div className="truncate text-xs text-muted-foreground">{d.verse_text}</div>
                  )}
                </button>
                <button
                  onClick={() => removeDevotional(d.id, d.day_number)}
                  className="mt-1 text-destructive hover:opacity-80"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
            {filteredDevotionals.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {devotionals.length === 0 ? "No devotionals yet." : "No matches."}
              </p>
            )}
          </ul>
          {filteredDevotionals.length > devVisible && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setDevVisible((v) => v + 20)}
              className="mt-3 w-full"
            >
              Load more ({filteredDevotionals.length - devVisible} remaining)
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Devotionals;
