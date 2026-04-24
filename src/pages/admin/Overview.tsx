import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  Users,
  Activity,
  CheckCircle2,
  Headphones,
  BookOpen,
  Calculator,
  Bookmark,
  Flame,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

interface Stats {
  total_users: number;
  new_users_7d: number;
  new_users_30d: number;
  active_users_today: number;
  active_users_7d: number;
  active_users_30d: number;
  completions_today: number;
  completions_7d: number;
  total_completions: number;
  total_audios: number;
  total_devotionals: number;
  total_simulations: number;
  total_bookmarks: number;
  avg_best_streak: number;
  max_best_streak: number;
  admin_count: number;
}

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

const Overview = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [signups, setSignups] = useState<{ day: string; count: number }[]>([]);
  const [completions, setCompletions] = useState<{ day: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [s, su, co] = await Promise.all([
          supabase.rpc("admin_get_overview_stats"),
          supabase.rpc("admin_get_signups_by_day", { _days: 30 }),
          supabase.rpc("admin_get_completions_by_day", { _days: 30 }),
        ]);
        if (s.error) throw s.error;
        if (su.error) throw su.error;
        if (co.error) throw co.error;
        setStats(s.data as unknown as Stats);
        setSignups(
          (su.data ?? []).map((r: { day: string; count: number }) => ({
            day: r.day.slice(5),
            count: Number(r.count),
          })),
        );
        setCompletions(
          (co.data ?? []).map((r: { day: string; count: number }) => ({
            day: r.day.slice(5),
            count: Number(r.count),
          })),
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load stats");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!stats) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl text-foreground">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Real-time snapshot of your community.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Total users"
          value={stats.total_users}
          hint={`+${stats.new_users_7d} this week`}
          icon={Users}
        />
        <Kpi
          label="Active today"
          value={stats.active_users_today}
          hint={`${stats.active_users_7d} in 7d · ${stats.active_users_30d} in 30d`}
          icon={Activity}
        />
        <Kpi
          label="Completions today"
          value={stats.completions_today}
          hint={`${stats.completions_7d} this week · ${stats.total_completions} all-time`}
          icon={CheckCircle2}
        />
        <Kpi
          label="Best streak (max)"
          value={stats.max_best_streak}
          hint={`Avg of streakers: ${stats.avg_best_streak} days`}
          icon={Flame}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Audios published" value={stats.total_audios} icon={Headphones} />
        <Kpi label="Devotionals" value={stats.total_devotionals} icon={BookOpen} />
        <Kpi label="Calculator runs" value={stats.total_simulations} icon={Calculator} />
        <Kpi label="Bible bookmarks" value={stats.total_bookmarks} icon={Bookmark} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/40 bg-card/40 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" /> New signups · last 30 days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={signups}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/40 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4 text-primary" /> Audio completions · last 30 days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={completions}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/40 bg-card/40 backdrop-blur">
        <CardContent className="flex flex-wrap items-center gap-6 p-5 text-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Admins:</span>
            <span className="font-medium text-foreground">{stats.admin_count}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">New users (30d):</span>
            <span className="font-medium text-foreground">{stats.new_users_30d}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Overview;
