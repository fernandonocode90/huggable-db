import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Calculator, DollarSign, TrendingUp, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Stats {
  total_simulations: number;
  unique_users: number;
  avg_initial_amount: number;
  avg_monthly_contribution: number;
  avg_annual_rate: number;
  avg_years: number;
  avg_total_final: number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

const Calculators = () => {
  const [s, setS] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.rpc("admin_get_calculator_stats");
        if (error) throw error;
        setS(data as unknown as Stats);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading)
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  if (!s) return null;

  const items = [
    { label: "Total simulations", value: s.total_simulations, icon: Calculator },
    { label: "Unique users", value: s.unique_users, icon: Users },
    { label: "Avg initial amount", value: fmt(Number(s.avg_initial_amount)), icon: DollarSign },
    { label: "Avg monthly", value: fmt(Number(s.avg_monthly_contribution)), icon: DollarSign },
    { label: "Avg annual rate", value: `${s.avg_annual_rate}%`, icon: TrendingUp },
    { label: "Avg years", value: s.avg_years, icon: TrendingUp },
    { label: "Avg projected total", value: fmt(Number(s.avg_total_final)), icon: DollarSign },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-foreground">Calculators</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Aggregate behavior across saved compound-interest simulations.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it) => (
          <Card key={it.label} className="border-border/40 bg-card/40 backdrop-blur">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    {it.label}
                  </p>
                  <p className="mt-2 font-display text-2xl text-foreground tabular-nums">
                    {it.value}
                  </p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <it.icon className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Calculators;
