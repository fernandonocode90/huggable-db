import { NightBackground } from "./NightBackground";
import { BottomNav } from "./BottomNav";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
  /** Tailwind max-width class for the inner container. Defaults to mobile (max-w-md). */
  maxWidthClass?: string;
}

export const AppShell = ({ children, maxWidthClass = "max-w-md" }: AppShellProps) => {
  return (
    <NightBackground>
      <div
        className={cn(
          "mx-auto flex min-h-screen flex-col px-6 pb-32 pt-12",
          maxWidthClass,
        )}
      >
        {children}
      </div>
      <BottomNav />
    </NightBackground>
  );
};
