import { useState, useEffect } from "react";
import { useAppSettings } from "@/hooks/useAppSettings";
import { Info, AlertTriangle, CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const GlobalBanner = () => {
  const { settings } = useAppSettings();
  const banner = settings.global_banner;
  const [dismissed, setDismissed] = useState(false);

  // Reset dismissal whenever the banner content changes
  useEffect(() => {
    setDismissed(false);
  }, [banner.message, banner.variant, banner.enabled]);

  if (!banner.enabled || !banner.message || dismissed) return null;

  const Icon =
    banner.variant === "warning"
      ? AlertTriangle
      : banner.variant === "success"
        ? CheckCircle2
        : Info;

  const styles =
    banner.variant === "warning"
      ? "bg-amber-500 text-amber-950 border-amber-600"
      : banner.variant === "success"
        ? "bg-emerald-500 text-emerald-950 border-emerald-600"
        : "bg-primary text-primary-foreground border-primary";

  return (
    <div
      role="alert"
      className={cn(
        "sticky top-0 z-[100] w-full border-b shadow-lg animate-in slide-in-from-top duration-300",
        styles,
      )}
    >
      <div className="relative mx-auto flex max-w-5xl items-center justify-center gap-3 px-12 py-3 text-sm font-medium sm:text-base">
        <Icon className="h-5 w-5 shrink-0" />
        <span className="text-center">{banner.message}</span>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Fechar aviso"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 transition-colors hover:bg-black/10"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
