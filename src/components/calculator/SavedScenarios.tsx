import { useEffect, useState } from "react";
import { Bookmark, Trash2, Plus, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export interface ScenarioSnapshot {
  initial_amount: number;
  monthly_contribution: number;
  annual_rate: number;
  years: number;
  total_final: number;
}

export interface SavedScenario extends ScenarioSnapshot {
  id: string;
  name: string;
  created_at: string;
}

interface Props {
  current: ScenarioSnapshot;
  formatCurrency: (n: number) => string;
  onLoad: (s: SavedScenario) => void;
}

export const SavedScenarios = ({ current, formatCurrency, onLoad }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [scenarios, setScenarios] = useState<SavedScenario[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("calculator_simulations")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast({ title: "Couldn't load scenarios", description: error.message, variant: "destructive" });
      return;
    }
    setScenarios((data ?? []) as SavedScenario[]);
  };

  useEffect(() => {
    if (user) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const save = async () => {
    if (!user) {
      toast({ title: "Sign in to save scenarios", variant: "destructive" });
      return;
    }
    const trimmed = name.trim();
    if (!trimmed) {
      toast({ title: "Name your scenario first", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("calculator_simulations").insert({
      user_id: user.id,
      name: trimmed,
      initial_amount: current.initial_amount,
      monthly_contribution: current.monthly_contribution,
      annual_rate: current.annual_rate,
      years: Math.max(1, Math.round(current.years)),
      total_final: current.total_final,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Scenario saved" });
    setName("");
    setOpen(false);
    void load();
  };

  const remove = async (id: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("calculator_simulations")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      toast({ title: "Couldn't delete", description: error.message, variant: "destructive" });
      return;
    }
    setScenarios((s) => s.filter((x) => x.id !== id));
  };

  return (
    <section className="glass-card mt-6 animate-fade-up rounded-3xl p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
            <Bookmark className="h-5 w-5 text-primary" strokeWidth={1.6} />
          </div>
          <div>
            <h2 className="font-display text-base text-foreground">
              Saved scenarios
            </h2>
            <p className="text-xs text-muted-foreground">
              Compare different strategies side by side.
            </p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Save
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save scenario</DialogTitle>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor="scenario-name">Name</Label>
              <Input
                id="scenario-name"
                placeholder="e.g. Aggressive 10y"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                autoFocus
              />
            </div>
            <div className="rounded-xl bg-muted/30 p-3 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Initial</span>
                <span className="text-foreground">
                  {formatCurrency(current.initial_amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Monthly</span>
                <span className="text-foreground">
                  {formatCurrency(current.monthly_contribution)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Rate</span>
                <span className="text-foreground">{current.annual_rate}% / yr</span>
              </div>
              <div className="flex justify-between">
                <span>Period</span>
                <span className="text-foreground">{current.years} years</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-border/40 pt-2">
                <span>Final</span>
                <span className="font-medium text-primary">
                  {formatCurrency(current.total_final)}
                </span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save scenario"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="mt-4 text-center text-xs text-muted-foreground">Loading…</p>
      ) : scenarios.length === 0 ? (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          No saved scenarios yet. Save one to come back to it later.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {scenarios.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-3 rounded-2xl bg-background/30 px-3 py-2.5"
            >
              <button
                onClick={() => {
                  onLoad(s);
                  toast({ title: `Loaded "${s.name}"` });
                }}
                className="flex flex-1 items-center gap-3 text-left"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15">
                  <Check className="h-4 w-4 text-primary" strokeWidth={1.8} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground">
                    {s.name}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {formatCurrency(s.initial_amount)} +{" "}
                    {formatCurrency(s.monthly_contribution)}/mo · {s.annual_rate}%
                    · {s.years}y → {formatCurrency(Number(s.total_final))}
                  </div>
                </div>
              </button>
              <button
                onClick={() => remove(s.id)}
                aria-label={`Delete ${s.name}`}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};