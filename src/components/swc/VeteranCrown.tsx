import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";

interface VeteranCrownProps {
  className?: string;
  /** Number of completed journeys; shown as a small badge if > 1. */
  count?: number;
  size?: number;
}

/**
 * Small golden crown shown next to a user's name once they've completed
 * the 365-day journey at least once.
 */
export const VeteranCrown = ({ className, count, size = 14 }: VeteranCrownProps) => {
  if (count !== undefined && count < 1) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 align-middle text-primary",
        className,
      )}
      title={
        count && count > 1
          ? `Completed the journey ${count} times`
          : "Completed the 365-day journey"
      }
      aria-label={
        count && count > 1
          ? `Completed the journey ${count} times`
          : "Completed the 365-day journey"
      }
    >
      <Crown
        style={{ width: size, height: size }}
        strokeWidth={2}
        className="drop-shadow-[0_0_4px_hsl(var(--primary)/0.6)]"
        fill="currentColor"
      />
      {count !== undefined && count > 1 && (
        <span className="text-[10px] font-semibold leading-none">{count}</span>
      )}
    </span>
  );
};
