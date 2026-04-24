import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Activity,
  AlertCircle,
  Bell,
  BellOff,
  CheckCircle2,
  Clock,
  Headphones,
  Loader2,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

interface Health {
  audios_total: number;
  audios_missing_duration: number;
  audios_missing_day_number: number;
  devotionals_total: number;
  push_subs_total: number;
  push_subs_stale_30d: number;
  client_errors_24h: number;
  client_errors_7d: number;
  reminders_sent_24h: number;
  banned_users: number;
  last_audio_added: string | null;
  last_devotional_added: string | null;
  last_admin_action: string | null;
}

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleString() : "—";

const Stat = ({
  label,
  value,
  hint,
  status,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  hint?: string;
  status: "ok" | "warn" | "bad";
  icon: React.ComponentType<{ className?: string }>;
}) => {
  const color =
    status === "bad"
      ? "text-destructive"
      : status === "warn"
        ? "text-amber-400"
        : "text-primary";
  const ring =
    status === "bad"
      ? "ring-destructive/40 bg-destructive/10"
      : status === "warn"
        ? "ring-amber-400/40 bg-amber-400/10"
        : "ring-primary/40 bg-primary/10";
  return (
    <Card className="border-border/40 bg-card/40 backdrop-blur">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className={`rounded-lg p-2 ring-1 ${ring}`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
            <p className={`mt-1 font-display text-2xl tabular-nums ${color}`}>
              {value}
            </p>
            {hint && (
              <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const Health = () => {
  const [data, setData] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data: res, error } = await supabase.rpc("admin_get_health");
      if (error) throw error;
      setData(res as unknown as Health);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load health");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (loading || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasContentIssue =
    data.audios_missing_duration > 0 || data.audios_missing_day_number > 0;
  const hasErrorIssue = data.client_errors_24h > 0;
  const hasStaleSubs = data.push_subs_stale_30d > 5;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-foreground">System Health</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Verifique problemas operacionais antes que usuários reclamem.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Atualizar
        </Button>
      </div>

      {/* Summary banner */}
      {!hasContentIssue && !hasErrorIssue && !hasStaleSubs ? (
        <div className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-primary">
          <CheckCircle2 className="h-4 w-4" />
          Tudo certo. Sem alertas no momento.
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-lg border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-300">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            Atenção: {[
              hasContentIssue && "conteúdo de áudio incompleto",
              hasErrorIssue && "erros do client nas últimas 24h",
              hasStaleSubs && "muitas inscrições push antigas",
            ]
              .filter(Boolean)
              .join(" · ")}
            .
          </span>
        </div>
      )}

      <section>
        <h2 className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">
          Conteúdo
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Áudios totais"
            value={data.audios_total}
            icon={Headphones}
            status="ok"
            hint={`Último: ${fmtDate(data.last_audio_added)}`}
          />
          <Stat
            label="Sem duração"
            value={data.audios_missing_duration}
            icon={Clock}
            status={data.audios_missing_duration > 0 ? "warn" : "ok"}
            hint="Backfill automático ao primeiro play"
          />
          <Stat
            label="Sem dia"
            value={data.audios_missing_day_number}
            icon={AlertCircle}
            status={data.audios_missing_day_number > 0 ? "bad" : "ok"}
            hint="Não aparecem na jornada"
          />
          <Stat
            label="Devotionals"
            value={data.devotionals_total}
            icon={Activity}
            status="ok"
            hint={`Último: ${fmtDate(data.last_devotional_added)}`}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">
          Notificações
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Inscrições push"
            value={data.push_subs_total}
            icon={Bell}
            status="ok"
          />
          <Stat
            label="Inscrições antigas (30d)"
            value={data.push_subs_stale_30d}
            icon={BellOff}
            status={data.push_subs_stale_30d > 5 ? "warn" : "ok"}
            hint="Provavelmente desinstalaram"
          />
          <Stat
            label="Lembretes enviados (24h)"
            value={data.reminders_sent_24h}
            icon={Bell}
            status="ok"
          />
          <Stat
            label="Usuários banidos"
            value={data.banned_users}
            icon={ShieldAlert}
            status={data.banned_users > 0 ? "warn" : "ok"}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">
          Erros do client
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Últimas 24h"
            value={data.client_errors_24h}
            icon={AlertCircle}
            status={
              data.client_errors_24h === 0
                ? "ok"
                : data.client_errors_24h > 10
                  ? "bad"
                  : "warn"
            }
          />
          <Stat
            label="Últimos 7 dias"
            value={data.client_errors_7d}
            icon={AlertCircle}
            status={data.client_errors_7d > 50 ? "bad" : "ok"}
          />
          <Card className="border-border/40 bg-card/40 backdrop-blur sm:col-span-2 lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Última ação admin
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground">
                {fmtDate(data.last_admin_action)}
              </p>
            </CardContent>
          </Card>
        </div>
        <div className="mt-3 text-xs text-muted-foreground">
          Veja os erros detalhados em{" "}
          <a className="text-primary hover:underline" href="/admin/errors">
            /admin/errors
          </a>
          .
        </div>
      </section>
    </div>
  );
};

export default Health;
