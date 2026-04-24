import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, HelpCircle, Plus, RotateCcw, Scale, Trash2 } from "lucide-react";
import { AppShell } from "@/components/swc/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/compoundInterest";

type Item = { id: string; label: string; amount: string };

const uid = () => Math.random().toString(36).slice(2, 9);

const DEFAULT_ASSETS: Item[] = [
  { id: uid(), label: "Cash & checking", amount: "5000" },
  { id: uid(), label: "Investments", amount: "20000" },
  { id: uid(), label: "Home value", amount: "0" },
];

const DEFAULT_LIABILITIES: Item[] = [
  { id: uid(), label: "Credit cards", amount: "1500" },
  { id: uid(), label: "Mortgage", amount: "0" },
  { id: uid(), label: "Student loans", amount: "0" },
];

const num = (v: string) => {
  const n = Number(v.replace(/,/g, "."));
  return isFinite(n) ? n : 0;
};

const NetWorth = () => {
  const navigate = useNavigate();
  const [assets, setAssets] = useState<Item[]>(DEFAULT_ASSETS);
  const [liabilities, setLiabilities] = useState<Item[]>(DEFAULT_LIABILITIES);

  const totals = useMemo(() => {
    const a = assets.reduce((sum, x) => sum + num(x.amount), 0);
    const l = liabilities.reduce((sum, x) => sum + num(x.amount), 0);
    return { assets: a, liabilities: l, net: a - l };
  }, [assets, liabilities]);

  const fmt = (n: number) => formatCurrency(n, "USD");

  const updateItem = (
    list: "a" | "l",
    id: string,
    patch: Partial<Item>,
  ) => {
    const setter = list === "a" ? setAssets : setLiabilities;
    setter((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const addItem = (list: "a" | "l") => {
    const setter = list === "a" ? setAssets : setLiabilities;
    setter((prev) => [...prev, { id: uid(), label: "", amount: "0" }]);
  };

  const removeItem = (list: "a" | "l", id: string) => {
    const setter = list === "a" ? setAssets : setLiabilities;
    setter((prev) => prev.filter((it) => it.id !== id));
  };

  const reset = () => {
    setAssets(DEFAULT_ASSETS.map((x) => ({ ...x, id: uid() })));
    setLiabilities(DEFAULT_LIABILITIES.map((x) => ({ ...x, id: uid() })));
  };

  const ratio =
    totals.assets > 0
      ? Math.max(0, Math.min(100, (totals.liabilities / totals.assets) * 100))
      : 0;

  return (
    <AppShell>
      <header className="animate-fade-up flex items-center justify-between gap-3">
        <button
          onClick={() => navigate("/tools")}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/30 text-foreground transition-colors hover:bg-muted/50"
          aria-label="Back to tools"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
        </button>
        <div className="flex-1 text-center">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
            The Balance of Truth
          </p>
          <h1 className="mt-1 font-display text-2xl">
            <span className="gold-text">Net</span>{" "}
            <span className="text-foreground">Worth</span>
          </h1>
        </div>
        <HelpDialog />
      </header>

      <section className="glass-card mt-6 animate-fade-up rounded-3xl p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15">
            <Scale className="h-5 w-5 text-primary" strokeWidth={1.5} />
          </div>
          <div className="flex-1">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Your net worth
            </p>
            <p
              className={`font-display text-3xl ${totals.net >= 0 ? "gold-text" : "text-destructive"}`}
            >
              {fmt(totals.net)}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <MiniStat label="Total assets" value={fmt(totals.assets)} tone="positive" />
          <MiniStat label="Total liabilities" value={fmt(totals.liabilities)} tone="negative" />
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Debt as % of assets</span>
            <span>{ratio.toFixed(0)}%</span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted/30">
            <div
              className={`h-full rounded-full transition-[width] duration-500 ${
                ratio < 50
                  ? "bg-gradient-to-r from-primary/70 to-primary"
                  : ratio < 80
                    ? "bg-gradient-to-r from-accent/70 to-accent"
                    : "bg-gradient-to-r from-destructive/70 to-destructive"
              }`}
              style={{ width: `${ratio}%` }}
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={reset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>
      </section>

      <section className="mt-6 grid animate-fade-up grid-cols-1 gap-4 lg:grid-cols-2">
        <Column
          title="Assets"
          subtitle="What you own"
          color="positive"
          items={assets}
          total={totals.assets}
          fmt={fmt}
          onChange={(id, p) => updateItem("a", id, p)}
          onRemove={(id) => removeItem("a", id)}
          onAdd={() => addItem("a")}
        />
        <Column
          title="Liabilities"
          subtitle="What you owe"
          color="negative"
          items={liabilities}
          total={totals.liabilities}
          fmt={fmt}
          onChange={(id, p) => updateItem("l", id, p)}
          onRemove={(id) => removeItem("l", id)}
          onAdd={() => addItem("l")}
        />
      </section>

      <section className="glass-card mt-6 animate-fade-up rounded-3xl p-5">
        <h2 className="font-display text-base text-foreground">The cold mirror</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Income shows what flows through your hands. Net worth shows what
          actually <em>stays</em>. The number above is the only honest measure
          of wealth — the rest is appearance.
        </p>
      </section>
    </AppShell>
  );
};

const MiniStat = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "positive" | "negative";
}) => (
  <div className="rounded-2xl border border-border/40 bg-muted/10 p-3">
    <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
      {label}
    </p>
    <p
      className={`mt-1 font-display text-base ${tone === "positive" ? "text-primary" : "text-destructive"}`}
    >
      {value}
    </p>
  </div>
);

const Column = ({
  title,
  subtitle,
  color,
  items,
  total,
  fmt,
  onChange,
  onRemove,
  onAdd,
}: {
  title: string;
  subtitle: string;
  color: "positive" | "negative";
  items: Item[];
  total: number;
  fmt: (n: number) => string;
  onChange: (id: string, p: Partial<Item>) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
}) => (
  <div className="glass-card rounded-3xl p-5">
    <div className="flex items-baseline justify-between">
      <div>
        <h2 className="font-display text-lg text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <p
        className={`font-display text-lg ${color === "positive" ? "text-primary" : "text-destructive"}`}
      >
        {fmt(total)}
      </p>
    </div>
    <ul className="mt-4 space-y-2">
      {items.map((it) => (
        <li key={it.id} className="flex items-center gap-2">
          <Input
            value={it.label}
            placeholder="Label"
            onChange={(e) => onChange(it.id, { label: e.target.value })}
            className="flex-1"
          />
          <Input
            type="number"
            inputMode="decimal"
            value={it.amount}
            onChange={(e) => onChange(it.id, { amount: e.target.value })}
            className="w-32"
          />
          <button
            onClick={() => onRemove(it.id)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/30 hover:text-destructive"
            aria-label="Remove"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </li>
      ))}
    </ul>
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onAdd}
      className="mt-3 gap-2"
    >
      <Plus className="h-4 w-4" />
      Add line
    </Button>
  </div>
);

const HelpDialog = () => (
  <Dialog>
    <DialogTrigger asChild>
      <button
        className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/30 text-foreground transition-colors hover:bg-muted/50"
        aria-label="How it works"
      >
        <HelpCircle className="h-5 w-5" strokeWidth={1.5} />
      </button>
    </DialogTrigger>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="font-display text-xl">
          About this calculator
        </DialogTitle>
        <DialogDescription className="text-sm leading-relaxed">
          Net worth is the single most honest measure of your financial
          position. It is what you would have left if you sold every asset and
          paid every debt today.
          <br />
          <br />
          <strong>Assets</strong> — anything with real market value: cash,
          checking and savings balances, investment accounts, retirement
          accounts, the realistic resale value of your home and vehicles.
          <br />
          <strong>Liabilities</strong> — everything you owe: mortgage balance,
          car loans, student loans, credit cards, personal loans.
          <br />
          <br />
          The formula is simply <strong>Assets − Liabilities</strong>. Track
          this number monthly. Watching it rise — even slowly — is the truest
          sign you are building wealth, not just earning income.
        </DialogDescription>
      </DialogHeader>
    </DialogContent>
  </Dialog>
);

export default NetWorth;
