import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, BellOff, Smartphone, Send, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Stats {
  reminders_enabled: number;
  reminders_disabled: number;
  push_subscriptions: number;
  unique_subscribed_users: number;
  reminders_sent_7d: number;
  reminders_sent_30d: number;
}

const Reminders = () => {
  const [s, setS] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.rpc("admin_get_reminder_stats");
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
    { label: "Reminders enabled", value: s.reminders_enabled, icon: Bell },
    { label: "Reminders disabled", value: s.reminders_disabled, icon: BellOff },
    { label: "Push subscriptions", value: s.push_subscriptions, icon: Smartphone },
    { label: "Unique subscribers", value: s.unique_subscribed_users, icon: Users },
    { label: "Sent in last 7 days", value: s.reminders_sent_7d, icon: Send },
    { label: "Sent in last 30 days", value: s.reminders_sent_30d, icon: Send },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-foreground">Reminders & Notifications</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Push subscriptions and daily reminder activity.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => (
          <Card key={it.label} className="border-border/40 bg-card/40 backdrop-blur">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    {it.label}
                  </p>
                  <p className="mt-2 font-display text-3xl text-foreground tabular-nums">
                    {it.value}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <it.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Reminders;
