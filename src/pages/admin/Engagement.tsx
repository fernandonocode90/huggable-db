import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Loader2, Send, TrendingDown, Megaphone } from "lucide-react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface DropoffRow {
  day_number: number;
  title: string;
  reached: number;
  completed: number;
  dropoff_rate: number;
}

const Engagement = () => {
  const [pushTitle, setPushTitle] = useState("");
  const [pushBody, setPushBody] = useState("");
  const [pushUrl, setPushUrl] = useState("/");
  const [audience, setAudience] = useState<"all" | "active7" | "active30">("all");
  const [sending, setSending] = useState(false);

  const [dropoff, setDropoff] = useState<DropoffRow[]>([]);
  const [loadingDropoff, setLoadingDropoff] = useState(true);

  const loadDropoff = async () => {
    setLoadingDropoff(true);
    try {
      const { data, error } = await supabase.rpc("admin_get_dropoff_by_day");
      if (error) throw error;
      setDropoff((data ?? []) as DropoffRow[]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load drop-off");
    } finally {
      setLoadingDropoff(false);
    }
  };

  useEffect(() => {
    void loadDropoff();
  }, []);

  const sendBroadcast = async () => {
    if (!pushTitle.trim() || !pushBody.trim()) {
      toast.error("Título e mensagem são obrigatórios");
      return;
    }
    setSending(true);
    try {
      const body: Record<string, unknown> = {
        title: pushTitle,
        body: pushBody,
        url: pushUrl || "/",
      };
      if (audience === "active7") body.only_active_days = 7;
      if (audience === "active30") body.only_active_days = 30;

      const { data, error } = await supabase.functions.invoke("admin-broadcast-push", {
        body,
      });
      if (error) throw error;
      const r = data as { sent: number; failed: number; removed: number; target_users: number | string };
      toast.success(
        `Enviadas: ${r.sent} · Falhas: ${r.failed} · Removidas: ${r.removed}`,
      );
      setPushTitle("");
      setPushBody("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const worstDays = [...dropoff].sort((a, b) => b.dropoff_rate - a.dropoff_rate).slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-foreground">Engagement</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Envie notificações em massa e veja onde os usuários abandonam a jornada.
        </p>
      </div>

      {/* Push broadcast */}
      <Card className="p-6 bg-card/40 backdrop-blur border-border/40">
        <div className="flex items-start gap-3 mb-4">
          <div className="rounded-lg bg-primary/15 p-2">
            <Megaphone className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-medium text-foreground">Push notification em massa</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Envia uma notificação push pra todos os dispositivos registrados do público escolhido.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <Label htmlFor="push-title">Título</Label>
              <Input
                id="push-title"
                value={pushTitle}
                onChange={(e) => setPushTitle(e.target.value)}
                maxLength={120}
                placeholder="Solomon Wealth Code"
                className="mt-1.5"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">{pushTitle.length}/120</p>
            </div>
            <div>
              <Label htmlFor="push-body">Mensagem</Label>
              <Textarea
                id="push-body"
                value={pushBody}
                onChange={(e) => setPushBody(e.target.value)}
                maxLength={400}
                rows={4}
                placeholder="Hoje tem áudio especial pra você. Não perca!"
                className="mt-1.5"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">{pushBody.length}/400</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label htmlFor="push-url">URL ao clicar</Label>
              <Input
                id="push-url"
                value={pushUrl}
                onChange={(e) => setPushUrl(e.target.value)}
                placeholder="/audio"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="push-audience">Público</Label>
              <Select value={audience} onValueChange={(v) => setAudience(v as typeof audience)}>
                <SelectTrigger id="push-audience" className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os inscritos</SelectItem>
                  <SelectItem value="active7">Ativos nos últimos 7 dias</SelectItem>
                  <SelectItem value="active30">Ativos nos últimos 30 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Preview */}
            <div className="rounded-lg border border-border/40 bg-background/40 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                Pré-visualização
              </p>
              <p className="text-sm font-medium text-foreground truncate">
                {pushTitle || "Título"}
              </p>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                {pushBody || "Mensagem da notificação"}
              </p>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  className="w-full"
                  disabled={sending || !pushTitle.trim() || !pushBody.trim()}
                >
                  {sending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Enviar push
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Enviar notificação?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Será disparada uma notificação push para{" "}
                    {audience === "all"
                      ? "todos os usuários inscritos"
                      : audience === "active7"
                        ? "usuários ativos nos últimos 7 dias"
                        : "usuários ativos nos últimos 30 dias"}
                    . Essa ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={sendBroadcast}>
                    Enviar agora
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </Card>

      {/* Drop-off analysis */}
      <Card className="p-6 bg-card/40 backdrop-blur border-border/40">
        <div className="flex items-start gap-3 mb-4">
          <div className="rounded-lg bg-destructive/15 p-2">
            <TrendingDown className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h2 className="font-medium text-foreground">Drop-off por dia</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Para cada dia da jornada: quantos chegaram vs quantos completaram. Use pra identificar
              quais áudios refazer.
            </p>
          </div>
        </div>

        {loadingDropoff ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : dropoff.length === 0 ? (
          <p className="text-sm text-muted-foreground py-12 text-center">
            Sem dados de jornada ainda.
          </p>
        ) : (
          <>
            {/* Chart */}
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dropoff} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
                  <XAxis
                    dataKey="day_number"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    label={{ value: "Dia", position: "insideBottom", offset: -2, fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(value: number, _name, props) => {
                      const row = props.payload as DropoffRow;
                      return [
                        `${value}% drop-off (${row.completed}/${row.reached})`,
                        row.title || `Dia ${row.day_number}`,
                      ];
                    }}
                    labelFormatter={(label) => `Dia ${label}`}
                  />
                  <Bar dataKey="dropoff_rate" radius={[4, 4, 0, 0]}>
                    {dropoff.map((row) => (
                      <Cell
                        key={row.day_number}
                        fill={
                          row.dropoff_rate >= 70
                            ? "hsl(var(--destructive))"
                            : row.dropoff_rate >= 40
                              ? "hsl(38 92% 50%)"
                              : "hsl(var(--primary))"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Worst days table */}
            <div className="mt-6">
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                Top 5 piores dias (maior drop-off)
              </h3>
              <div className="space-y-1.5">
                {worstDays.map((row) => (
                  <div
                    key={row.day_number}
                    className="flex items-center justify-between rounded-lg border border-border/40 bg-background/40 px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-display text-base text-foreground tabular-nums w-8">
                        {row.day_number}
                      </span>
                      <span className="text-foreground truncate">{row.title || "—"}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs shrink-0">
                      <span className="text-muted-foreground tabular-nums">
                        {row.completed}/{row.reached}
                      </span>
                      <span
                        className={
                          row.dropoff_rate >= 70
                            ? "text-destructive font-medium tabular-nums"
                            : row.dropoff_rate >= 40
                              ? "text-amber-400 font-medium tabular-nums"
                              : "text-foreground tabular-nums"
                        }
                      >
                        {row.dropoff_rate}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default Engagement;
