import nightImg from "@/assets/night-mountains.webp";
import dayImg from "@/assets/day-mountains.webp";
import { StarField } from "./StarField";
import { useTheme } from "@/hooks/useTheme";

interface NightBackgroundProps {
  showStars?: boolean;
  children?: React.ReactNode;
}

export const NightBackground = ({ showStars = true, children }: NightBackgroundProps) => {
  const { theme } = useTheme();
  const isDay = theme === "day";
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-night">
      <div
        className="pointer-events-none fixed inset-0 bg-cover bg-center transition-opacity duration-700"
        style={{
          backgroundImage: `url(${isDay ? dayImg : nightImg})`,
          opacity: isDay ? 0.85 : 0.6,
        }}
        aria-hidden
      />
      <div
        className={
          isDay
            ? "pointer-events-none fixed inset-0 bg-gradient-to-b from-surface-deep/30 via-surface-deep/10 to-surface-deep/40"
            : "pointer-events-none fixed inset-0 bg-gradient-to-b from-surface-deep/80 via-surface-deep/40 to-surface-deep/85"
        }
        aria-hidden
      />
      {showStars && !isDay && <StarField count={50} />}
      <div className="relative z-10">{children}</div>
    </div>
  );
};
