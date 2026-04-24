import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle = ({ className }: ThemeToggleProps) => {
  const { theme, toggleTheme } = useTheme();
  const isDay = theme === "day";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDay ? "Switch to night theme" : "Switch to day theme"}
      className={cn(
        "glass-card flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:text-primary",
        className
      )}
    >
      {isDay ? <Moon className="h-5 w-5" strokeWidth={1.8} /> : <Sun className="h-5 w-5" strokeWidth={1.8} />}
    </button>
  );
};
