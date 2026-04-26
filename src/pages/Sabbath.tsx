import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, HelpCircle, RotateCcw, Moon } from "lucide-react";
import { AppShell } from "@/components/swc/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Disclaimer } from "@/components/Disclaimer";
import { formatCurrency } from "@/lib/compoundInterest";

const num = (v: string) => {
  const n = Number(v.replace(/,/g, "."));
  return isFinite(n) && n >= 0 ? n : 0;
};

const Sabbath = () => {
  const navigate = useNavigate();
  const [annual, setAnnual] = useState("75000");
  const [hours, setHours] = useState("50");
  const [restHours, setRestHours] = useState("8");

  const a = num(annual);
  const h = Math.max(1, num(hours));
  const rest = num(restHours);

  const hourlyValue = useMemo(() => a / (h * 52), [a, h]);
  const dailyEarning = hourlyValue * 8;
  const restValue = hourlyValue * rest;
  const ratio = ((rest / (h * 7 / 7)) * 100).toFixed(0);

  const fmt = (n: number) => formatCurrency(n, "USD");

  const reset = () => { setAnnual("75000"); setHours("50"); setRestHours("8"); };

  return (
    <AppShell>
      <header className="animate-fade-up flex items-center justify-between gap-3">
        <button onClick={() => navigate("/tools")} className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/30 text-foreground transition-colors hover:bg-muted/50" aria-label="Back to tools">
          <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
        </button>
        <div className="flex-1 text-center">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Holy Pause</p>
          <h1 className="mt-1 font-display text-2xl">
            <span className="gold-text">Sabbath</span>{" "}
            <span className="text-foreground">Rest</span>
          </h1>
        </div>
        <HelpDialog />
      </header>

      <section className="glass-card mt-6 animate-fade-up rounded-3xl p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15">
            <Moon className="h-5 w-5 text-primary" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="font-display text-base text-foreground">Time, money & rest</h2>
            <p className="text-xs text-muted-foreground">What does an hour of your life truly cost?</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5 sm:col-span-3"><Label htmlFor="ann">Annual income (USD)</Label><Input id="ann" type="number" inputMode="decimal" value={annual} onChange={(e) => setAnnual(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="hrs">Work hours / week</Label><Input id="hrs" type="number" inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value)} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="rest">Sleep hours / night</Label><Input id="rest" type="number" inputMode="decimal" value={restHours} onChange={(e) => setRestHours(e.target.value)} /></div>
        </div>

        <div className="mt-5 flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={reset} className="gap-2">
            <RotateCcw className="h-4 w-4" /> Reset
          </Button>
        </div>
      </section>

      <section className="mt-6 grid gap-3 md:grid-cols-3">
        <div className="glass-card rounded-2xl p-5 animate-fade-up ring-1 ring-primary/40">
          <p className="text-[11px] uppercase tracking-[0.16em] text-primary">An hour of your life is worth</p>
          <p className="mt-1 font-display text-3xl gold-text">{fmt(hourlyValue)}</p>
        </div>
        <div className="glass-card rounded-2xl p-5 animate-fade-up">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">A working day (8h)</p>
          <p className="mt-1 font-display text-2xl text-foreground">{fmt(dailyEarning)}</p>
        </div>
        <div className="glass-card rounded-2xl p-5 animate-fade-up">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">A night of rest</p>
          <p className="mt-1 font-display text-2xl text-foreground">{fmt(restValue)}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">opportunity cost</p>
        </div>
      </section>

      <section className="glass-card mt-6 animate-fade-up rounded-3xl p-5">
        <p className="text-[11px] uppercase tracking-[0.18em] text-primary">Weekly rhythm</p>
        <div className="mt-3 grid grid-cols-7 gap-1.5">
          {Array.from({ length: 7 }, (_, i) => {
            const isSabbath = i === 6;
            return (
              <div
                key={i}
                className={`aspect-square rounded-xl flex items-center justify-center text-[10px] font-medium ${
                  isSabbath
                    ? "bg-primary/20 text-primary ring-1 ring-primary/40"
                    : "bg-muted/30 text-muted-foreground"
                }`}
              >
                {isSabbath ? "REST" : "WORK"}
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Six days of work, one of holy rest. The pattern is older than money — it's woven into creation itself.
        </p>
      </section>

      <section className="glass-card mt-6 animate-fade-up rounded-3xl p-5">
        <h2 className="font-display text-base text-foreground">Remember the Sabbath</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground italic">
          "Remember the Sabbath day, to keep it holy. Six days you shall labor, and do all your work,
          but the seventh day is a Sabbath to the Lord your God." — Exodus 20:8-10
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          You worked {h} hours this week. The world will tell you to do more. Wisdom tells you to stop —
          to trust that your worth is not measured in output. Hidden context: ratio rest/work = {ratio}%.
        </p>
      </section>

      <Disclaimer variant="financial" />
    </AppShell>
  );
};

const HelpDialog = () => (
  <Dialog>
    <DialogTrigger asChild>
      <button className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/30 text-foreground transition-colors hover:bg-muted/50" aria-label="How it works">
        <HelpCircle className="h-5 w-5" strokeWidth={1.5} />
      </button>
    </DialogTrigger>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="font-display text-xl">About this calculator</DialogTitle>
        <DialogDescription className="text-sm leading-relaxed">
          A meditative tool — not a productivity hack. It computes the dollar value of your time
          to make the case for rest tangible. The Sabbath isn't laziness; it's an act of trust.
        </DialogDescription>
      </DialogHeader>
    </DialogContent>
  </Dialog>
);

export default Sabbath;
