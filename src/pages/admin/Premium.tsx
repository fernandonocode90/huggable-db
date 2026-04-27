import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Crown,
  Search,
  Loader2,
  CreditCard,
  Apple,
  Smartphone,
  Gift,
  ExternalLink,
  XCircle,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";

interface PremiumStats {
  total_premium: number;
  by_provider: { stripe: number; google: number; apple: number; manual: number };
  trialing: number;
  canceling: number;
  stripe_monthly_count: number;
  stripe_annual_count: number;
  estimated_mrr_brl: number;
  estimated_arr_brl: number;
  prices: { monthly: number; annual: number };
}

interface PremiumUser {
  user_id: string;
  email: string | null;
  display_name: string | null;
  provider: "stripe" | "google" | "apple" | "manual";
  plan: string;
  status: string;
  trial_end: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  total_count: number;
}

const PAGE = 25;
const BRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

const PROVIDER_META: Record<
  PremiumUser["provider"],
  { label: string; icon: typeof CreditCard; tone: string }
> = {
  stripe: { label: "Stripe", icon: CreditCard, tone: "bg-violet-500/15 text-violet-300" },
  google: { label: "Google Play", icon: Smartphone, tone: "bg-emerald-500/15 text-emerald-300" },
  apple: { label: "App Store", icon: Apple, tone: "bg-slate-500/15 text-slate-200" },
  manual: { label: "Cortesia", tone: "bg-amber-500/15 text-amber-300", icon: Gift },
};

const Premium = () => {
  const [stats, setStats] = useState<PremiumStats | null>(null);
  const [rows, setRows] = useState<PremiumUser[]>([]);
  const [search, setSearch] = useState("");
  const [provider, setProvider] = useState<string>("all");
  const [statusTab, setStatusTab] = useState<"active" | "trialing" | "canceled">("active");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detailUser, setDetailUser] = useState<PremiumUser | null>(null);
  const [cancelTarget, setCancelTarget] = useState<PremiumUser | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<PremiumUser | null>(null);
  const [grantOpen, setGrantOpen] = useState(false);
  const [grantEmail, setGrantEmail] = useState("");
  const [grantMonths, setGrantMonths] = useState("12");
  const [grantReason, setGrantReason] = useState("");
  const [working, setWorking] = useState(false);
  const [copyingEmails, setCopyingEmails] = useState(false);

  const loadStats = async () => {
    const { data, error } = await supabase.rpc("admin_premium_stats");
    if (error) {
      toast.error(error.message);
      return;
    }
    setStats(data as unknown as PremiumStats);
  };

  const load = async (q: string, p: number, prov: string, status: typeof statusTab) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_list_premium_users_by_status", {
        _status: status,
        _search: q || null,
        _provider: prov === "all" ? null : prov,
        _limit: PAGE,
        _offset: p * PAGE,
      });
      if (error) throw error;
      const list = (data ?? []) as PremiumUser[];
      setRows(list);
      setTotal(list[0]?.total_count ? Number(list[0].total_count) : 0);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao listar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStats();
  }, []);

  useEffect(() => {
    void load(search, page, provider, statusTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, provider, statusTab]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(0);
      void load(search, 0, provider, statusTab);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const copyAllEmails = async () => {
    if (total === 0) return;
    setCopyingEmails(true);
    try {
      const all: PremiumUser[] = [];
      const pageSize = 500;
      const pages = Math.ceil(total / pageSize);
      for (let i = 0; i < pages; i++) {
        const { data, error } = await supabase.rpc("admin_list_premium_users_by_status", {
          _status: statusTab,
          _search: search || null,
          _provider: provider === "all" ? null : provider,
          _limit: pageSize,
          _offset: i * pageSize,
        });
        if (error) throw error;
        all.push(...((data ?? []) as PremiumUser[]));
      }
      const emails = Array.from(
        new Set(all.map((u) => u.email).filter((e): e is string => !!e)),
      );
      await navigator.clipboard.writeText(emails.join(", "));
      toast.success(`${emails.length} emails copiados`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao copiar");
    } finally {
      setCopyingEmails(false);
    }
  };


  const refresh = async () => {
    await Promise.all([loadStats(), load(search, page, provider, statusTab)]);
  };

  const cancelImmediate = async () => {
    if (!cancelTarget) return;
    setWorking(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-cancel-subscription", {
        body: { user_id: cancelTarget.user_id },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      toast.success("Assinatura cancelada agora");
      setCancelTarget(null);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha");
    } finally {
      setWorking(false);
    }
  };

  const revokeManual = async () => {
    if (!revokeTarget) return;
    setWorking(true);
    try {
      const { error } = await supabase.rpc("admin_revoke_manual_premium", {
        _user_id: revokeTarget.user_id,
      });
      if (error) throw error;
      toast.success("Cortesia revogada");
      setRevokeTarget(null);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha");
    } finally {
      setWorking(false);
    }
  };

  const grantPremium = async () => {
    const email = grantEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Informe um email válido");
      return;
    }
    setWorking(true);
    try {
      const months = grantMonths === "lifetime" ? null : parseInt(grantMonths, 10);
      const { data: result, error } = await supabase.functions.invoke("admin-grant-premium", {
        body: { email, months, reason: grantReason || null },
      });
      if (error) throw error;
      const res = result as {
        error?: string;
        kind?: "existing_user" | "voucher";
        email_sent?: boolean;
        email_error?: string | null;
      };
      if (res?.error) throw new Error(res.error);

      if (res.kind === "voucher") {
        toast.success(
          res.email_sent
            ? `${email} ainda não tem conta — enviamos o convite com o presente`
            : `Cortesia reservada para ${email} (claim no cadastro)`,
        );
      } else {
        toast.success(
          res.email_sent
            ? `Premium concedido a ${email} · email enviado`
            : `Premium concedido a ${email}`,
        );
      }
      if (!res.email_sent && res.email_error) {
        toast.warning(`Email não enviado: ${res.email_error}`);
      }
      setGrantOpen(false);
      setGrantEmail("");
      setGrantMonths("12");
      setGrantReason("");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha");
    } finally {
      setWorking(false);
    }
  };

  const openStripeCustomer = (customerId: string | null) => {
    if (!customerId) return;
    window.open(`https://dashboard.stripe.com/customers/${customerId}`, "_blank");
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-foreground flex items-center gap-2">
            <Crown className="h-7 w-7 text-amber-400" /> Premium
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Membros ativos, receita estimada e suporte de assinatura.
          </p>
        </div>
        <Button onClick={() => setGrantOpen(true)} className="gap-2">
          <Gift className="h-4 w-4" /> Conceder cortesia
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Crown}
          label="Total premium ativos"
          value={stats?.total_premium ?? "—"}
          sub={
            stats ? `${stats.trialing} em trial · ${stats.canceling} cancelando no fim` : undefined
          }
        />
        <KpiCard
          icon={DollarSign}
          label="MRR estimado"
          value={stats ? BRL(stats.estimated_mrr_brl) : "—"}
          sub={stats ? `ARR ${BRL(stats.estimated_arr_brl)}` : undefined}
        />
        <KpiCard
          icon={CreditCard}
          label="Stripe"
          value={stats?.by_provider.stripe ?? "—"}
          sub={
            stats
              ? `${stats.stripe_monthly_count} mensal · ${stats.stripe_annual_count} anual`
              : undefined
          }
        />
        <KpiCard
          icon={Smartphone}
          label="Google + Apple"
          value={
            stats ? stats.by_provider.google + stats.by_provider.apple : "—"
          }
          sub={
            stats
              ? `${stats.by_provider.google} Google · ${stats.by_provider.apple} Apple`
              : "Em breve"
          }
        />
      </div>

      {stats && stats.by_provider.manual > 0 && (
        <p className="text-xs text-muted-foreground">
          + {stats.by_provider.manual} {stats.by_provider.manual === 1 ? "cortesia" : "cortesias"} ativas (não contam no MRR)
        </p>
      )}

      {/* Status tabs */}
      <Tabs
        value={statusTab}
        onValueChange={(v) => {
          setStatusTab(v as typeof statusTab);
          setPage(0);
        }}
      >
        <TabsList>
          <TabsTrigger value="active" className="gap-2">
            Ativos
            {stats && (
              <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-300">
                {stats.total_premium - stats.trialing}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="trialing" className="gap-2">
            Em trial
            {stats && (
              <Badge variant="secondary" className="bg-blue-500/15 text-blue-300">
                {stats.trialing}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="canceled" className="gap-2">
            Cancelados
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-md flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por email ou nome…"
            className="pl-9"
          />
        </div>
        <Select
          value={provider}
          onValueChange={(v) => {
            setProvider(v);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as origens</SelectItem>
            <SelectItem value="stripe">Stripe</SelectItem>
            <SelectItem value="google">Google Play</SelectItem>
            <SelectItem value="apple">App Store</SelectItem>
            <SelectItem value="manual">Cortesia</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void copyAllEmails()}
          disabled={copyingEmails || total === 0}
          className="gap-2"
        >
          {copyingEmails ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Gift className="h-3.5 w-3.5" />
          )}
          Copiar emails ({total})
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border/40 bg-card/40 backdrop-blur">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>{statusTab === "canceled" ? "Cancelou em" : "Próxima cobrança"}</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum membro premium nesse filtro.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((u) => {
                const meta = PROVIDER_META[u.provider];
                const Icon = meta.icon;
                return (
                  <TableRow key={u.user_id}>
                    <TableCell>
                      <div className="font-medium text-foreground">{u.display_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{u.email ?? "—"}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={meta.tone}>
                        <Icon className="mr-1 h-3 w-3" /> {meta.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize text-sm">{u.plan}</TableCell>
                    <TableCell>
                      {u.status === "trialing" ? (
                        <Badge className="bg-blue-500/20 text-blue-300">Trial</Badge>
                      ) : u.cancel_at_period_end ? (
                        <Badge className="bg-orange-500/20 text-orange-300">Cancelando</Badge>
                      ) : (
                        <Badge className="bg-emerald-500/20 text-emerald-300">Ativo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {u.current_period_end
                        ? new Date(u.current_period_end).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => setDetailUser(u)}>
                        Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          disabled={page === 0 || loading}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >
          Anterior
        </Button>
        <span className="text-xs text-muted-foreground">
          {rows.length === 0 ? 0 : page * PAGE + 1}–{page * PAGE + rows.length} de {total} · página{" "}
          {page + 1}/{totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={(page + 1) * PAGE >= total || loading}
          onClick={() => setPage((p) => p + 1)}
        >
          Próxima
        </Button>
      </div>

      {/* Detail dialog */}
      <Dialog open={!!detailUser} onOpenChange={(o) => !o && setDetailUser(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{detailUser?.display_name || detailUser?.email}</DialogTitle>
            <DialogDescription>{detailUser?.email}</DialogDescription>
          </DialogHeader>
          {detailUser && (
            <div className="space-y-3 text-sm">
              <Row k="Origem" v={PROVIDER_META[detailUser.provider].label} />
              <Row k="Plano" v={detailUser.plan} />
              <Row k="Status" v={detailUser.status} />
              <Row
                k="Cancelando no fim do período"
                v={detailUser.cancel_at_period_end ? "Sim" : "Não"}
              />
              <Row
                k="Trial até"
                v={
                  detailUser.trial_end
                    ? new Date(detailUser.trial_end).toLocaleString()
                    : "—"
                }
              />
              <Row
                k="Próxima cobrança"
                v={
                  detailUser.current_period_end
                    ? new Date(detailUser.current_period_end).toLocaleString()
                    : "—"
                }
              />
              <Row
                k="Início da assinatura"
                v={new Date(detailUser.created_at).toLocaleString()}
              />
              {detailUser.stripe_customer_id && (
                <Row k="Stripe customer" v={detailUser.stripe_customer_id} mono />
              )}
              {detailUser.stripe_subscription_id && (
                <Row k="Stripe subscription" v={detailUser.stripe_subscription_id} mono />
              )}
            </div>
          )}
          <DialogFooter className="flex-wrap gap-2">
            {detailUser?.provider === "stripe" && detailUser.stripe_customer_id && (
              <Button
                variant="outline"
                onClick={() => openStripeCustomer(detailUser.stripe_customer_id)}
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" /> Abrir no Stripe
              </Button>
            )}
            {detailUser?.provider === "manual" ? (
              <Button
                variant="destructive"
                onClick={() => {
                  setRevokeTarget(detailUser);
                  setDetailUser(null);
                }}
                className="gap-2"
              >
                <XCircle className="h-4 w-4" /> Revogar cortesia
              </Button>
            ) : detailUser?.provider === "stripe" ? (
              <Button
                variant="destructive"
                onClick={() => {
                  setCancelTarget(detailUser);
                  setDetailUser(null);
                }}
                className="gap-2"
              >
                <XCircle className="h-4 w-4" /> Cancelar agora
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel confirm */}
      <AlertDialog open={!!cancelTarget} onOpenChange={(o) => !o && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar agora?</AlertDialogTitle>
            <AlertDialogDescription>
              A assinatura de <strong>{cancelTarget?.email}</strong> será cancelada imediatamente no Stripe e o usuário perde o acesso premium agora. Esta ação não pode ser desfeita pelo admin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={working}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              disabled={working}
              onClick={(e) => {
                e.preventDefault();
                void cancelImmediate();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {working ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cancelar agora"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke courtesy */}
      <AlertDialog open={!!revokeTarget} onOpenChange={(o) => !o && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar cortesia?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{revokeTarget?.email}</strong> perderá o acesso premium concedido manualmente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={working}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              disabled={working}
              onClick={(e) => {
                e.preventDefault();
                void revokeManual();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {working ? <Loader2 className="h-4 w-4 animate-spin" /> : "Revogar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Grant courtesy */}
      <Dialog open={grantOpen} onOpenChange={setGrantOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conceder premium (cortesia)</DialogTitle>
            <DialogDescription>
              Funciona com qualquer email — se a pessoa ainda não tem conta, enviamos um convite e o premium é ativado automaticamente quando ela se cadastrar com esse email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Email do beneficiário</label>
              <Input
                type="email"
                value={grantEmail}
                onChange={(e) => setGrantEmail(e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Duração</label>
              <Select value={grantMonths} onValueChange={setGrantMonths}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 mês</SelectItem>
                  <SelectItem value="3">3 meses</SelectItem>
                  <SelectItem value="6">6 meses</SelectItem>
                  <SelectItem value="12">1 ano</SelectItem>
                  <SelectItem value="lifetime">Vitalício</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Motivo (interno)</label>
              <Input
                value={grantReason}
                onChange={(e) => setGrantReason(e.target.value)}
                placeholder="Ex: cliente teve problema na cobrança"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGrantOpen(false)} disabled={working}>
              Cancelar
            </Button>
            <Button onClick={() => void grantPremium()} disabled={working}>
              {working ? <Loader2 className="h-4 w-4 animate-spin" /> : "Conceder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const KpiCard = ({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Crown;
  label: string;
  value: string | number;
  sub?: string;
}) => (
  <div className="rounded-xl border border-border/40 bg-card/40 p-4 backdrop-blur">
    <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
      <Icon className="h-3.5 w-3.5" /> {label}
    </div>
    <div className="mt-2 font-display text-3xl text-foreground">{value}</div>
    {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
  </div>
);

const Row = ({ k, v, mono }: { k: string; v: string; mono?: boolean }) => (
  <div className="flex items-start justify-between gap-3 border-b border-border/30 pb-2">
    <span className="text-xs uppercase tracking-wide text-muted-foreground">{k}</span>
    <span className={mono ? "font-mono text-xs break-all text-right" : "text-sm text-right"}>
      {v}
    </span>
  </div>
);

export default Premium;
