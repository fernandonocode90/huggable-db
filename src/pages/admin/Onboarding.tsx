import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import {
  Users,
  CheckCircle2,
  PieChart as PieIcon,
  TrendingUp,
  Download,
  ListChecks,
} from "lucide-react";

type Distributions = Record<string, Record<string, number>>;

interface Stats {
  total_users: number;
  total_started: number;
  total_completed: number;
  completion_rate: number;
  response_rate: number;
  distributions: {
    intent: Record<string, number>;
    season_of_life: Record<string, number>;
    experience: Record<string, number>;
    practice: Record<string, number>;
    commitment: Record<string, number>;
  };
  cross_intent_season: { intent: string; season: string; count: number }[];
}

// Friendly labels for the option ids used in src/pages/Onboarding.tsx
const LABELS: Record<string, Record<string, string>> = {
  intent: {
    anxiety: "Peace from money anxiety",
    wisdom: "Wisdom for decisions",
    habit: "A daily spiritual habit",
    generosity: "Live with open hands",
  },
  season_of_life: {
    starting: "Just starting out",
    building: "Building & growing",
    rebuilding: "Rebuilding from a setback",
    established: "Established, refining",
  },
  experience: {
    new: "New to it",
    some: "Some familiarity",
    deep: "Studies it regularly",
  },
  practice: {
    morning: "Morning",
    midday: "Midday",
    evening: "Evening",
    flexible: "Whenever I can",
  },
  commitment: {
    "5": "5 minutes",
    "10": "10 minutes",
    "20": "20 minutes",
  },
};

const QUESTION_TITLES: Record<keyof Stats["distributions"], string> = {
  intent: "What brings users here",
  season_of_life: "Season of life",
  experience: "Familiarity with biblical wisdom",
  practice: "Preferred practice time",
  commitment: "Daily commitment",
};

const PALETTE = [
  "hsl(var(--primary))",
  "hsl(var(--primary) / 0.75)",
  "hsl(var(--primary) / 0.55)",
  "hsl(var(--primary) / 0.35)",
  "hsl(var(--muted-foreground))",
];

const Kpi = ({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
}) => (
  <Card className="border-border/40 bg-card/40 backdrop-blur">
    <CardContent className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
          <p className="mt-2 font-display text-3xl text-foreground">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const toChartData = (
  field: keyof Stats["distributions"],
  raw: Record<string, number>,
) => {
  const labels = LABELS[field] ?? {};
  const total = Object.values(raw).reduce((a, b) => a + b, 0);
  return Object.entries(raw)
    .map(([k, v]) => ({
      key: k,
      label: labels[k] ?? k,
      count: v,
      pct: total > 0 ? Math.round((v / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);
};

const DistributionCard = ({
  field,
  raw,
}: {
  field: keyof Stats["distributions"];
  raw: Record<string, number>;
}) => {
  const data = toChartData(field, raw);
  const total = data.reduce((a, b) => a + b.count, 0);

  return (
    <Card className="border-border/40 bg-card/40 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <PieIcon className="h-4 w-4 text-primary" />
          {QUESTION_TITLES[field]}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{total} total responses</p>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No responses yet.</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="label"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  width={140}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number, _n, p) => [`${v} (${p.payload.pct}%)`, "Responses"]}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {data.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
              {data.map((d) => (
                <li key={d.key} className="flex justify-between">
                  <span>{d.label}</span>
                  <span className="font-medium text-foreground">
                    {d.count} · {d.pct}%
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
};

const csvEscape = (v: unknown) => {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const AdminOnboarding = () => {
  const [days, setDays] = useState<number | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setLoading(true);
    (async () => {
      const { data, error } = await supabase.rpc("admin_get_onboarding_stats", {
        _days: days,
      });
      if (error) {
        toast.error(error.message);
      } else {
        setStats(data as unknown as Stats);
      }
      setLoading(false);
    })();
  }, [days]);

  const topCross = useMemo(() => {
    return (stats?.cross_intent_season ?? [])
      .slice(0, 8)
      .map((r) => ({
        ...r,
        intentLabel: LABELS.intent[r.intent] ?? r.intent,
        seasonLabel: LABELS.season_of_life[r.season] ?? r.season,
      }));
  }, [stats]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase.rpc("admin_list_onboarding_responses", {
        _limit: 10000,
        _offset: 0,
      });
      if (error) throw error;
      const rows = (data ?? []) as Array<{
        user_id: string;
        email: string | null;
        display_name: string | null;
        intent: string | null;
        season_of_life: string | null;
        experience: string | null;
        practice: string | null;
        commitment: string | null;
        completed_at: string | null;
        created_at: string;
      }>;
      const headers = [
        "user_id",
        "email",
        "display_name",
        "intent",
        "season_of_life",
        "experience",
        "practice",
        "commitment",
        "completed_at",
        "created_at",
      ];
      const lines = [headers.join(",")];
      for (const r of rows) {
        lines.push(headers.map((h) => csvEscape((r as any)[h])).join(","));
      }
      const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `onboarding-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${rows.length} respostas exportadas`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao exportar");
    } finally {
      setExporting(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const RANGE_OPTIONS: { label: string; value: number | null }[] = [
    { label: "All time", value: null },
    { label: "Last 7d", value: 7 },
    { label: "Last 30d", value: 30 },
    { label: "Last 90d", value: 90 },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-foreground">Onboarding insights</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Understand who your users are and what they want — straight from the welcome flow.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-border/40 bg-card/40 p-1">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                onClick={() => setDays(opt.value)}
                className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
                  days === opt.value
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={exporting}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            {exporting ? "Exporting…" : "Export CSV"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Users in range"
          value={stats.total_users}
          hint="Signed-up profiles"
          icon={Users}
        />
        <Kpi
          label="Started onboarding"
          value={stats.total_started}
          hint={`${stats.response_rate}% of users`}
          icon={ListChecks}
        />
        <Kpi
          label="Completed"
          value={stats.total_completed}
          hint={`${stats.completion_rate}% of starters`}
          icon={CheckCircle2}
        />
        <Kpi
          label="Drop-off"
          value={`${Math.max(0, 100 - stats.completion_rate)}%`}
          hint="Of users who started"
          icon={TrendingUp}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DistributionCard field="intent" raw={stats.distributions.intent} />
        <DistributionCard field="season_of_life" raw={stats.distributions.season_of_life} />
        <DistributionCard field="experience" raw={stats.distributions.experience} />
        <DistributionCard field="practice" raw={stats.distributions.practice} />
        <DistributionCard field="commitment" raw={stats.distributions.commitment} />

        <Card className="border-border/40 bg-card/40 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" />
              Top intent × season combos
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Where your strongest user personas live.
            </p>
          </CardHeader>
          <CardContent>
            {topCross.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Not enough data yet.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {topCross.map((r, i) => (
                  <li
                    key={`${r.intent}-${r.season}`}
                    className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2"
                  >
                    <span className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-[11px] font-medium text-primary">
                        {i + 1}
                      </span>
                      <span className="text-foreground">{r.intentLabel}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-muted-foreground">{r.seasonLabel}</span>
                    </span>
                    <span className="font-medium text-foreground">{r.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminOnboarding;
