import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface Props {
  icon: LucideIcon;
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}

/**
 * Reusable empty-state for lists with no items yet. Branded glow + gold
 * heading so it never feels like a blank/broken screen.
 */
export const EmptyState = ({ icon: Icon, eyebrow, title, description, action }: Props) => (
  <div className="mx-auto flex max-w-sm flex-col items-center px-4 py-10 text-center animate-fade-up">
    <div className="relative">
      <div
        className="absolute inset-0 rounded-full blur-2xl"
        style={{ background: "hsl(var(--primary) / 0.25)" }}
        aria-hidden
      />
      <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/15 ring-1 ring-primary/40 shadow-[0_0_30px_hsl(var(--primary)/0.4)]">
        <Icon className="h-9 w-9 text-primary" strokeWidth={1.4} />
      </div>
    </div>
    {eyebrow && (
      <p className="mt-6 text-[11px] uppercase tracking-[0.28em] text-primary">
        {eyebrow}
      </p>
    )}
    <h2 className="mt-3 font-display text-2xl leading-tight">
      <span className="gold-text">{title}</span>
    </h2>
    <p className="mt-3 text-sm leading-relaxed text-foreground/75">
      {description}
    </p>
    {action && <div className="mt-6">{action}</div>}
  </div>
);
