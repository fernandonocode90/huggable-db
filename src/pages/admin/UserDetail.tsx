import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Loader2,
  Gift,
  CalendarCog,
  Ban,
  ShieldOff,
  Trash2,
  StickyNote,
  Smartphone,
  Headphones,
  CheckCircle2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface UserDetail {
  profile: {
    id: string;
    email: string | null;
    display_name: string | null;
    avatar_url: string | null;
    timezone: string;
    start_date: string;
    best_streak: number;
    reminder_enabled: boolean;
    reminder_time: string | null;
    created_at: string;
    last_sign_in_at: string | null;
    email_confirmed_at: string | null;
    current_day: number;
    current_streak: number;
    is_admin: boolean;
    is_banned: boolean;
    ban_reason: string | null;
  } | null;
  audio_progress: Array<{
    day_number: number;
    completed: boolean;
    progress_pct: number;
    last_position_seconds: number;
    updated_at: string;
    completed_at: string | null;
  }>;
  push_subscriptions: Array<{
    id: string;
    user_agent: string | null;
    created_at: string;
    updated_at: string;
  }>;
  bookmarks_count: number;
  simulations_count: number;
  reading_history_count: number;
  reminders_sent_count: number;
  notes: Array<{
    id: string;
    note: string;
    admin_id: string;
    created_at: string;
  }>;
}

const UserDetail = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const [data, setData] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [giftStreak, setGiftStreak] = useState("");
  const [setDay, setSetDay] = useState("");
  const [banReason, setBanReason] = useState("");
  const [newNote, setNewNote] = useState("");

  const load = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data: rpc, error } = await supabase.rpc("admin_get_user_detail", {
        _user_id: userId,
      });
      if (error) throw error;
      setData(rpc as unknown as UserDetail);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load user");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const run = async (label: string, fn: () => Promise<{ error: unknown }>) => {
    setBusy(true);
    try {
      const { error } = await fn();
      if (error) throw error;
      toast.success(label);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data?.profile) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">User not found.</p>
        <Button variant="outline" onClick={() => navigate("/admin/users")} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>
    );
  }

  const p = data.profile;
  const isMe = p.id === me?.id;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/users")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to users
        </Button>
        <div className="flex gap-2">
          {p.is_banned && <Badge variant="destructive">Banned</Badge>}
          {p.is_admin && <Badge className="bg-primary/20 text-primary hover:bg-primary/20">Admin</Badge>}
        </div>
      </div>

      {/* Header */}
      <Card className="p-6 bg-card/40 backdrop-blur border-border/40">
        <div className="flex flex-wrap items-start gap-4">
          <div className="h-16 w-16 rounded-full bg-muted overflow-hidden flex items-center justify-center text-xl font-display text-muted-foreground">
            {p.avatar_url ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" /> : (p.display_name?.[0] ?? p.email?.[0] ?? "?").toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-2xl text-foreground truncate">{p.display_name || "—"}</h1>
            <p className="text-sm text-muted-foreground truncate">{p.email}</p>
            <p className="text-xs text-muted-foreground mt-1">
              ID: <code className="text-[10px]">{p.id}</code>
            </p>
            {p.is_banned && p.ban_reason && (
              <p className="mt-2 text-xs text-destructive">Motivo: {p.ban_reason}</p>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat label="Dia atual" value={p.current_day} />
          <Stat label="Streak" value={p.current_streak} />
          <Stat label="Best streak" value={p.best_streak} />
          <Stat label="Bookmarks" value={data.bookmarks_count} />
          <Stat label="Simulações" value={data.simulations_count} />
          <Stat label="Capítulos lidos" value={data.reading_history_count} />
          <Stat label="Lembretes enviados" value={data.reminders_sent_count} />
          <Stat label="Dispositivos push" value={data.push_subscriptions.length} />
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-muted-foreground">
          <Info label="Cadastrado em" value={new Date(p.created_at).toLocaleString()} />
          <Info label="Último login" value={p.last_sign_in_at ? new Date(p.last_sign_in_at).toLocaleString() : "—"} />
          <Info label="Email confirmado" value={p.email_confirmed_at ? "Sim" : "Não"} />
          <Info label="Timezone" value={p.timezone} />
          <Info label="Data inicial" value={p.start_date} />
          <Info label="Lembrete diário" value={p.reminder_enabled ? `Sim · ${p.reminder_time ?? "—"}` : "Não"} />
        </div>
      </Card>

      {/* Actions */}
      <Card className="p-6 bg-card/40 backdrop-blur border-border/40">
        <h2 className="font-medium text-foreground mb-4">Ações administrativas</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Gift streak */}
          <div className="space-y-2 rounded-lg border border-border/40 p-4">
            <Label className="flex items-center gap-2 text-sm">
              <Gift className="h-4 w-4 text-primary" /> Presentear best streak
            </Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min={0}
                placeholder={String(p.best_streak)}
                value={giftStreak}
                onChange={(e) => setGiftStreak(e.target.value)}
              />
              <Button
                size="sm"
                disabled={busy || !giftStreak}
                onClick={() =>
                  run("Streak atualizado", () =>
                    supabase.rpc("admin_gift_streak", {
                      _user_id: p.id,
                      _new_best_streak: parseInt(giftStreak, 10),
                    })
                  )
                }
              >
                Aplicar
              </Button>
            </div>
          </div>

          {/* Set day */}
          <div className="space-y-2 rounded-lg border border-border/40 p-4">
            <Label className="flex items-center gap-2 text-sm">
              <CalendarCog className="h-4 w-4 text-primary" /> Definir dia da jornada
            </Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min={1}
                placeholder={String(p.current_day)}
                value={setDay}
                onChange={(e) => setSetDay(e.target.value)}
              />
              <Button
                size="sm"
                disabled={busy || !setDay}
                onClick={() =>
                  run("Dia atualizado", () =>
                    supabase.rpc("admin_set_user_day", {
                      _user_id: p.id,
                      _new_day: parseInt(setDay, 10),
                    })
                  )
                }
              >
                Aplicar
              </Button>
            </div>
          </div>

          {/* Ban / Unban */}
          {!isMe && (
            <div className="space-y-2 rounded-lg border border-border/40 p-4">
              <Label className="flex items-center gap-2 text-sm">
                {p.is_banned ? (
                  <>
                    <ShieldOff className="h-4 w-4 text-emerald-400" /> Desbanir usuário
                  </>
                ) : (
                  <>
                    <Ban className="h-4 w-4 text-destructive" /> Banir usuário
                  </>
                )}
              </Label>
              {p.is_banned ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    run("Usuário desbanido", () =>
                      supabase.rpc("admin_unban_user", { _user_id: p.id })
                    )
                  }
                >
                  Remover banimento
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="Motivo (opcional)"
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                  />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="destructive" disabled={busy}>
                        Banir
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Banir {p.email}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          O usuário será marcado como banido. Isso registra no log de auditoria.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() =>
                            run("Usuário banido", () =>
                              supabase.rpc("admin_ban_user", {
                                _user_id: p.id,
                                _reason: banReason,
                              })
                            )
                          }
                        >
                          Confirmar ban
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          )}

          {/* Wipe data */}
          {!isMe && (
            <div className="space-y-2 rounded-lg border border-destructive/30 p-4">
              <Label className="flex items-center gap-2 text-sm">
                <Trash2 className="h-4 w-4 text-destructive" /> Apagar todos os dados
              </Label>
              <p className="text-xs text-muted-foreground">
                Remove progresso, bookmarks, simulações, dispositivos. Não exclui a conta.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive" disabled={busy}>
                    Apagar dados
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Apagar todos os dados?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Essa ação é irreversível. Vai apagar progresso de áudios, bookmarks, simulações,
                      histórico de leitura e dispositivos push de {p.email}.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() =>
                        run("Dados apagados", () =>
                          supabase.rpc("admin_wipe_user_data", { _user_id: p.id })
                        )
                      }
                    >
                      Apagar tudo
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </Card>

      {/* Notes */}
      <Card className="p-6 bg-card/40 backdrop-blur border-border/40">
        <h2 className="font-medium text-foreground mb-4 flex items-center gap-2">
          <StickyNote className="h-4 w-4" /> Notas internas ({data.notes.length})
        </h2>
        <div className="flex gap-2 mb-4">
          <Textarea
            placeholder="Adicionar nota interna sobre este usuário…"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            rows={2}
          />
          <Button
            size="sm"
            disabled={busy || !newNote.trim()}
            onClick={async () => {
              await run("Nota adicionada", () =>
                supabase.rpc("admin_add_user_note", { _user_id: p.id, _note: newNote })
              );
              setNewNote("");
            }}
          >
            Adicionar
          </Button>
        </div>
        <div className="space-y-2">
          {data.notes.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sem notas ainda.</p>
          ) : (
            data.notes.map((n) => (
              <div key={n.id} className="rounded-lg border border-border/40 p-3 text-sm flex items-start justify-between gap-3">
                <div>
                  <p className="text-foreground whitespace-pre-wrap">{n.note}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() =>
                    run("Nota removida", () =>
                      supabase.rpc("admin_delete_user_note", { _note_id: n.id })
                    )
                  }
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Devices */}
      <Card className="p-6 bg-card/40 backdrop-blur border-border/40">
        <h2 className="font-medium text-foreground mb-4 flex items-center gap-2">
          <Smartphone className="h-4 w-4" /> Dispositivos push ({data.push_subscriptions.length})
        </h2>
        <div className="space-y-2">
          {data.push_subscriptions.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum dispositivo registrado.</p>
          ) : (
            data.push_subscriptions.map((d) => (
              <div key={d.id} className="rounded-lg border border-border/40 p-3 text-xs">
                <p className="text-foreground truncate">{d.user_agent || "Dispositivo desconhecido"}</p>
                <p className="text-muted-foreground mt-1">
                  Registrado em {new Date(d.created_at).toLocaleDateString()}
                </p>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Audio progress */}
      <Card className="p-6 bg-card/40 backdrop-blur border-border/40">
        <h2 className="font-medium text-foreground mb-4 flex items-center gap-2">
          <Headphones className="h-4 w-4" /> Progresso de áudios ({data.audio_progress.length})
        </h2>
        {data.audio_progress.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sem progresso registrado.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {data.audio_progress.slice(0, 30).map((a) => (
              <div
                key={a.day_number}
                className="rounded-lg border border-border/40 p-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">Dia {a.day_number}</span>
                  {a.completed && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                </div>
                <p className="text-muted-foreground mt-0.5">{Math.round(a.progress_pct)}%</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-lg border border-border/40 bg-background/40 p-3">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="font-display text-xl text-foreground tabular-nums">{value}</div>
  </div>
);

const Info = ({ label, value }: { label: string; value: string }) => (
  <div>
    <span className="text-muted-foreground">{label}: </span>
    <span className="text-foreground">{value}</span>
  </div>
);

export default UserDetail;
