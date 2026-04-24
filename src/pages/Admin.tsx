import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/swc/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Play, Trash2, Upload, BookOpen, Save, X, Loader2 } from "lucide-react";
import { BIBLE_BOOKS, BIBLE_BOOK_BY_KEY, fetchVerseRange, buildReference } from "@/lib/bible-books";

interface Audio {
  id: string;
  title: string;
  subtitle: string | null;
  day_number: number | null;
  release_date: string | null;
  r2_key: string;
  description?: string | null;
  prayer_text?: string | null;
}

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

const Admin = () => {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [audios, setAudios] = useState<Audio[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingAudioId, setEditingAudioId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    day_number: "",
    description: "",
    prayer_text: "",
  });

  const [devotionals, setDevotionals] = useState<Devotional[]>([]);
  const [devBusy, setDevBusy] = useState(false);
  const [verseLoading, setVerseLoading] = useState(false);
  const [editingDevotionalId, setEditingDevotionalId] = useState<string | null>(null);
  const [autoBibleImportState, setAutoBibleImportState] = useState<"idle" | "running" | "done">("idle");
  const [devForm, setDevForm] = useState({
    day_number: "",
    book_key: "",
    chapter: "",
    verse_start: "",
    verse_end: "",
    verse_text: "",
    reflection_text: "",
  });

  const [audioSearch, setAudioSearch] = useState("");
  const [audioVisible, setAudioVisible] = useState(20);
  const [devSearch, setDevSearch] = useState("");
  const [devVisible, setDevVisible] = useState(20);

  const filteredAudios = useMemo(() => {
    const q = audioSearch.trim().toLowerCase();
    if (!q) return audios;
    return audios.filter(
      (a) =>
        String(a.day_number ?? "").includes(q) ||
        a.title.toLowerCase().includes(q) ||
        (a.subtitle ?? "").toLowerCase().includes(q),
    );
  }, [audios, audioSearch]);

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

  // Reset pagination when search changes
  useEffect(() => setAudioVisible(20), [audioSearch]);
  useEffect(() => setDevVisible(20), [devSearch]);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  const refresh = async () => {
    const { data } = await supabase
      .from("daily_audios")
      .select("id,title,subtitle,day_number,release_date,r2_key,description,prayer_text")
      .order("day_number", { ascending: true, nullsFirst: false });
    setAudios(data ?? []);
  };

  const refreshDevotionals = async () => {
    const { data } = await supabase
      .from("daily_devotionals")
      .select("id,day_number,verse_reference,verse_text,reflection_text,book_key,chapter,verse_start,verse_end,translation")
      .order("day_number", { ascending: true });
    setDevotionals(data ?? []);
  };

  const ensureBibleImported = async () => {
    if (!isAdmin || autoBibleImportState !== "idle") return;

    setAutoBibleImportState("running");
    try {
      const translations = ["kjv", "acf", "rvr1909"] as const;
      const counts = await Promise.all(
        translations.map(async (translation) => {
          const { count } = await supabase
            .from("bible_verses")
            .select("*", { count: "exact", head: true })
            .eq("translation", translation);
          return { translation, count: count ?? 0 };
        })
      );

      const missing = counts
        .filter(({ count }) => count < 23000)
        .map(({ translation }) => translation);

      for (const translation of missing) {
        const { data, error } = await supabase.functions.invoke("import-bible", {
          body: { translation, force: false },
        });
        if (error) throw error;
        if (!data?.ok && !data?.skipped) {
          throw new Error(`Import failed for ${translation}`);
        }
      }

      if (missing.length > 0) {
        toast.success("Bíblias importadas no banco de dados.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao importar a Bíblia");
    } finally {
      setAutoBibleImportState("done");
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    refresh();
    refreshDevotionals();
    void ensureBibleImported();
  }, [isAdmin]);

  const resetAudioForm = () => {
    setEditingAudioId(null);
    setFile(null);
    setForm({
      title: "",
      subtitle: "",
      day_number: "",
      description: "",
      prayer_text: "",
    });
  };

  const editAudio = (a: Audio) => {
    setEditingAudioId(a.id);
    setFile(null);
    setForm({
      title: a.title ?? "",
      subtitle: a.subtitle ?? "",
      day_number: a.day_number ? String(a.day_number) : "",
      description: a.description ?? "",
      prayer_text: a.prayer_text ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.day_number) return toast.error("Enter the day number");
    const dayNum = Number(form.day_number);
    if (!Number.isInteger(dayNum) || dayNum < 1) {
      return toast.error("Day number must be a positive integer");
    }
    if (!editingAudioId && !file) return toast.error("Select an audio file");
    setBusy(true);
    try {
      // EDIT MODE: update metadata only (file replacement optional)
      if (editingAudioId) {
        let r2_key: string | undefined;
        if (file) {
          const { data: signed, error: sErr } = await supabase.functions.invoke("r2-sign-upload", {
            body: { filename: file.name, contentType: file.type || "audio/mpeg", dayNumber: dayNum },
          });
          if (sErr || !signed?.url) throw new Error(sErr?.message ?? "sign failed");
          const put = await fetch(signed.url, {
            method: "PUT",
            headers: { "Content-Type": file.type || "audio/mpeg" },
            body: file,
          });
          if (!put.ok) throw new Error(`R2 upload ${put.status}`);
          r2_key = signed.key;
        }
        const updatePayload = {
          title: form.title,
          subtitle: form.subtitle || null,
          day_number: dayNum,
          description: form.description || null,
          prayer_text: form.prayer_text || null,
          ...(r2_key ? { r2_key } : {}),
        };
        const { error: uErr } = await supabase
          .from("daily_audios")
          .update(updatePayload)
          .eq("id", editingAudioId);
        if (uErr) throw uErr;
        toast.success("Audio updated");
        resetAudioForm();
        refresh();
        return;
      }

      // CREATE MODE
      const { data: existing } = await supabase
        .from("daily_audios")
        .select("id,title")
        .eq("day_number", dayNum)
        .maybeSingle();
      if (existing) {
        throw new Error(`Day ${dayNum} already has an audio: "${existing.title}"`);
      }
      const { data: signed, error: sErr } = await supabase.functions.invoke("r2-sign-upload", {
        body: { filename: file!.name, contentType: file!.type || "audio/mpeg", dayNumber: dayNum },
      });
      if (sErr || !signed?.url) throw new Error(sErr?.message ?? "sign failed");
      const put = await fetch(signed.url, {
        method: "PUT",
        headers: { "Content-Type": file!.type || "audio/mpeg" },
        body: file!,
      });
      if (!put.ok) throw new Error(`R2 upload ${put.status}`);
      const { error: iErr } = await supabase.from("daily_audios").insert({
        title: form.title,
        subtitle: form.subtitle || null,
        day_number: dayNum,
        release_date: new Date().toISOString().slice(0, 10),
        r2_key: signed.key,
        description: form.description || null,
        prayer_text: form.prayer_text || null,
        created_by: user!.id,
      });
      if (iErr) throw iErr;
      toast.success("Audio published!");
      resetAudioForm();
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this audio? (the R2 file will not be removed)")) return;
    const { error } = await supabase.from("daily_audios").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      if (editingAudioId === id) resetAudioForm();
      refresh();
    }
  };

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
    [devForm.book_key]
  );

  // Auto-fetch verse text whenever book/chapter/verse_start/verse_end change
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
        if (res) {
          setDevForm((f) => ({ ...f, verse_text: res.text }));
        }
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
      if (editingDevotionalId === id) resetDevotionalForm();
      refreshDevotionals();
    }
  };

  if (loading) return <AppShell><p className="text-muted-foreground text-center mt-20">Loading...</p></AppShell>;
  if (!isAdmin)
    return (
      <AppShell>
        <div className="mt-20 text-center">
          <h1 className="font-display text-2xl text-foreground">Restricted access</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This area is for administrators only.
          </p>
        </div>
      </AppShell>
    );

  return (
    <AppShell>
      <header className="animate-fade-up">
        <h1 className="font-display text-3xl">
          <span className="gold-text">Admin</span>{" "}
          <span className="text-foreground">Sanctuary</span>
        </h1>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mt-1">
          Manage daily audios
        </p>
      </header>

      <form onSubmit={submit} className="glass-card mt-6 rounded-3xl p-5 space-y-3 animate-fade-up">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg text-foreground">
            {editingAudioId ? "Edit audio" : "New audio"}
          </h2>
          {editingAudioId && (
            <button
              type="button"
              onClick={resetAudioForm}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" /> Cancel
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5 col-span-2">
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>Subtitle</Label>
            <Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Day #</Label>
            <Input type="number" min="1" required value={form.day_number} onChange={(e) => setForm({ ...form, day_number: e.target.value })} />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder="A brief description of this audio"
            />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>Prayer</Label>
            <Textarea value={form.prayer_text} onChange={(e) => setForm({ ...form, prayer_text: e.target.value })} rows={3} />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>Audio file (.mp3){editingAudioId ? " — leave empty to keep current" : ""}</Label>
            <Input type="file" accept="audio/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>
        <Button type="submit" disabled={busy} className="w-full">
          {editingAudioId ? <Save className="h-4 w-4 mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
          {busy
            ? editingAudioId ? "Saving..." : "Uploading..."
            : editingAudioId ? "Save changes" : "Publish audio"}
        </Button>
      </form>

      <section className="mt-6 animate-fade-up">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="font-display text-lg text-foreground">Registered audios</h2>
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {filteredAudios.length}/{audios.length}
          </span>
        </div>
        <Input
          placeholder="Search by day, title…"
          value={audioSearch}
          onChange={(e) => setAudioSearch(e.target.value)}
          className="mb-3"
        />
        <ul className="space-y-2">
          {filteredAudios.slice(0, audioVisible).map((a) => (
            <li
              key={a.id}
              className={`glass-card rounded-2xl p-4 flex items-center justify-between gap-3 ${
                editingAudioId === a.id ? "ring-1 ring-primary/60" : ""
              }`}
            >
              <button
                onClick={() => editAudio(a)}
                className="flex-1 min-w-0 flex items-center gap-3 text-left"
                aria-label={`Edit audio for day ${a.day_number ?? ""}`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <span className="font-display text-xs font-semibold">
                    {a.day_number ?? "—"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{a.title}</div>
                <div className="text-xs text-muted-foreground">
                  {a.day_number ? `Day ${a.day_number}` : "(no day)"}
                </div>
                </div>
              </button>
              <button
                onClick={() => a.day_number && navigate(`/audio?day=${a.day_number}`)}
                disabled={!a.day_number}
                className="text-muted-foreground hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Preview audio"
              >
                <Play className="h-4 w-4 fill-current" strokeWidth={0} />
              </button>
              <button onClick={() => remove(a.id)} className="text-destructive hover:opacity-80">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
          {filteredAudios.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              {audios.length === 0 ? "No audios yet." : "No matches."}
            </p>
          )}
        </ul>
        {filteredAudios.length > audioVisible && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setAudioVisible((v) => v + 20)}
            className="w-full mt-3"
          >
            Load more ({filteredAudios.length - audioVisible} remaining)
          </Button>
        )}
      </section>

      <section className="mt-10 animate-fade-up">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg text-foreground">Daily devotionals</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          One verse and one reflection per day (1–365). Saving an existing day overwrites it.
        </p>

        <form onSubmit={submitDevotional} className="glass-card rounded-3xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base text-foreground">
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

          <div className="grid grid-cols-2 gap-3">
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
            <div className="space-y-1.5">
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
            <div className="grid grid-cols-2 gap-3">
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
            </div>
            <div className="space-y-1.5 col-span-2">
              <div className="flex items-center justify-between">
                <Label>Verse of the day {verseLoading && <Loader2 className="inline h-3 w-3 animate-spin ml-1" />}</Label>
                <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Auto-filled (KJV)
                </span>
              </div>
              <Textarea
                rows={4}
                value={devForm.verse_text}
                onChange={(e) => setDevForm({ ...devForm, verse_text: e.target.value })}
                placeholder="Pick a book, chapter and verse — the text loads automatically."
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Reflection of the day</Label>
              <Textarea
                rows={5}
                value={devForm.reflection_text}
                onChange={(e) => setDevForm({ ...devForm, reflection_text: e.target.value })}
              />
            </div>
          </div>
          <Button type="submit" disabled={devBusy} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            {devBusy ? "Saving..." : editingDevotionalId ? "Save changes" : "Save devotional"}
          </Button>
        </form>

        <div className="mt-6 flex items-center justify-between gap-3 mb-3">
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
              className={`glass-card rounded-2xl p-4 flex items-start justify-between gap-3 ${
                editingDevotionalId === d.id ? "ring-1 ring-primary/60" : ""
              }`}
            >
              <button
                onClick={() => editDevotional(d)}
                className="flex-1 min-w-0 text-left"
              >
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Day {d.day_number}
                </div>
                <div className="text-sm font-medium text-foreground truncate">
                  {d.verse_reference || "(no reference)"}
                </div>
                {d.verse_text && (
                  <div className="text-xs text-muted-foreground truncate">{d.verse_text}</div>
                )}
              </button>
              <button
                onClick={() => removeDevotional(d.id, d.day_number)}
                className="text-destructive hover:opacity-80 mt-1"
                aria-label={`Delete day ${d.day_number}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
          {filteredDevotionals.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              {devotionals.length === 0 ? "No devotionals yet." : "No matches."}
            </p>
          )}
        </ul>
        {filteredDevotionals.length > devVisible && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setDevVisible((v) => v + 20)}
            className="w-full mt-3"
          >
            Load more ({filteredDevotionals.length - devVisible} remaining)
          </Button>
        )}
      </section>
    </AppShell>
  );
};

export default Admin;