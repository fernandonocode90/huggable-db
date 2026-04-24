import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Play, Trash2, Upload, Save, X } from "lucide-react";
import { AudioMetrics } from "./AudioMetrics";

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

const Audios = () => {
  const { user } = useAuth();
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
  const [audioSearch, setAudioSearch] = useState("");
  const [audioVisible, setAudioVisible] = useState(20);

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

  useEffect(() => setAudioVisible(20), [audioSearch]);

  const refresh = async () => {
    const { data } = await supabase
      .from("daily_audios")
      .select("id,title,subtitle,day_number,release_date,r2_key,description,prayer_text")
      .order("day_number", { ascending: true, nullsFirst: false });
    setAudios(data ?? []);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const resetAudioForm = () => {
    setEditingAudioId(null);
    setFile(null);
    setForm({ title: "", subtitle: "", day_number: "", description: "", prayer_text: "" });
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
        await supabase.rpc("log_admin_action", {
          _action: "update_audio",
          _entity_type: "audio",
          _entity_id: editingAudioId,
          _metadata: { day_number: dayNum, title: form.title },
        });
        toast.success("Audio updated");
        resetAudioForm();
        refresh();
        return;
      }

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
      const { data: inserted, error: iErr } = await supabase
        .from("daily_audios")
        .insert({
          title: form.title,
          subtitle: form.subtitle || null,
          day_number: dayNum,
          release_date: new Date().toISOString().slice(0, 10),
          r2_key: signed.key,
          description: form.description || null,
          prayer_text: form.prayer_text || null,
          created_by: user!.id,
        })
        .select("id")
        .single();
      if (iErr) throw iErr;
      await supabase.rpc("log_admin_action", {
        _action: "create_audio",
        _entity_type: "audio",
        _entity_id: inserted?.id ?? null,
        _metadata: { day_number: dayNum, title: form.title },
      });
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
    if (error) {
      toast.error(error.message);
    } else {
      await supabase.rpc("log_admin_action", {
        _action: "delete_audio",
        _entity_type: "audio",
        _entity_id: id,
      });
      if (editingAudioId === id) resetAudioForm();
      refresh();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-foreground">Audios</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Publish, edit and analyse daily audio sessions.
        </p>
      </div>

      <Tabs defaultValue="manage">
        <TabsList>
          <TabsTrigger value="manage">Manage</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="manage" className="space-y-6">
          <Card className="border-border/40 bg-card/40 backdrop-blur">
            <CardContent className="p-6">
              <form onSubmit={submit} className="space-y-4">
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
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>Title</Label>
                    <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Day #</Label>
                    <Input
                      type="number"
                      min="1"
                      required
                      value={form.day_number}
                      onChange={(e) => setForm({ ...form, day_number: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-3">
                    <Label>Subtitle</Label>
                    <Input
                      value={form.subtitle}
                      onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-3">
                    <Label>Description</Label>
                    <Textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-3">
                    <Label>Prayer</Label>
                    <Textarea
                      value={form.prayer_text}
                      onChange={(e) => setForm({ ...form, prayer_text: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-3">
                    <Label>
                      Audio file (.mp3){editingAudioId ? " — leave empty to keep current" : ""}
                    </Label>
                    <Input
                      type="file"
                      accept="audio/*"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    />
                  </div>
                </div>
                <Button type="submit" disabled={busy} className="w-full md:w-auto">
                  {editingAudioId ? <Save className="mr-2 h-4 w-4" /> : <Upload className="mr-2 h-4 w-4" />}
                  {busy
                    ? editingAudioId
                      ? "Saving..."
                      : "Uploading..."
                    : editingAudioId
                      ? "Save changes"
                      : "Publish audio"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-card/40 backdrop-blur">
            <CardContent className="p-6">
              <div className="mb-3 flex items-center justify-between gap-3">
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
                    className={`flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-background/40 p-4 ${
                      editingAudioId === a.id ? "ring-1 ring-primary/60" : ""
                    }`}
                  >
                    <button
                      onClick={() => editAudio(a)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                        <span className="font-display text-xs font-semibold">{a.day_number ?? "—"}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-foreground">{a.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {a.subtitle || (a.day_number ? `Day ${a.day_number}` : "(no day)")}
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => a.day_number && navigate(`/audio?day=${a.day_number}`)}
                      disabled={!a.day_number}
                      className="text-muted-foreground hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Play className="h-4 w-4 fill-current" strokeWidth={0} />
                    </button>
                    <button onClick={() => remove(a.id)} className="text-destructive hover:opacity-80">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
                {filteredAudios.length === 0 && (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    {audios.length === 0 ? "No audios yet." : "No matches."}
                  </p>
                )}
              </ul>
              {filteredAudios.length > audioVisible && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAudioVisible((v) => v + 20)}
                  className="mt-3 w-full"
                >
                  Load more ({filteredAudios.length - audioVisible} remaining)
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics">
          <AudioMetrics />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Audios;
