import { NightBackground } from "./NightBackground";
import { BottomNav } from "./BottomNav";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
  /**
   * Tailwind max-width classes for the inner container.
   * Default scales gracefully from mobile → tablet → desktop.
   * Pass a custom string to override (e.g. for ultra-wide tools).
   */
  maxWidthClass?: string;
}

export const AppShell = ({
  children,
  maxWidthClass = "max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-5xl",
}: AppShellProps) => {
  return (
    <NightBackground>
      <div
        className={cn(
          "mx-auto flex min-h-screen flex-col px-6 pb-32 pt-12 md:px-10 lg:px-12",
          maxWidthClass,
        )}
      >
        {children}
      </div>
      <BottomNav />
    </NightBackground>
  );
};
