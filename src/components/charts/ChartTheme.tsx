import { ReactNode } from "react";
import { ResponsiveContainer } from "recharts";

/** Shared tooltip style for all calculator charts. */
export const tooltipStyle = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 12,
  color: "hsl(var(--popover-foreground))",
  fontSize: 12,
};

/** Wrapper that gives every chart the same glass card + heading treatment. */
export const ChartCard = ({
  title,
  subtitle,
  height = 260,
  children,
  delay = 0,
}: {
  title: string;
  subtitle?: string;
  height?: number;
  children: ReactNode;
  delay?: number;
}) => (
  <section
    className="glass-card mt-6 animate-fade-up rounded-3xl p-5"
    style={{ animationDelay: `${delay}ms` }}
  >
    <h2 className="font-display text-lg text-foreground">{title}</h2>
    {subtitle && (
      <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
    )}
    <div className="mt-4 w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children as any}
      </ResponsiveContainer>
    </div>
  </section>
);

/** Gold + muted gradient defs you can drop into any AreaChart. */
export const GoldGradients = ({ idA = "grad-gold", idB = "grad-muted" }: { idA?: string; idB?: string }) => (
  <defs>
    <linearGradient id={idA} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
    </linearGradient>
    <linearGradient id={idB} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.4} />
      <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.05} />
    </linearGradient>
  </defs>
);
