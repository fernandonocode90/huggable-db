import { useAppSettings } from "@/hooks/useAppSettings";
import { Info, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const GlobalBanner = () => {
  const { settings } = useAppSettings();
  const banner = settings.global_banner;

  if (!banner.enabled || !banner.message) return null;

  const Icon = banner.variant === "warning" ? AlertTriangle : banner.variant === "success" ? CheckCircle2 : Info;
  const styles =
    banner.variant === "warning"
      ? "bg-amber-500/15 text-amber-200 border-amber-500/30"
      : banner.variant === "success"
        ? "bg-emerald-500/15 text-emerald-200 border-emerald-500/30"
        : "bg-primary/15 text-primary border-primary/30";

  return (
    <div className={cn("flex items-center justify-center gap-2 border-b px-4 py-2 text-xs sm:text-sm", styles)}>
      <Icon className="h-4 w-4 shrink-0" />
      <span className="text-center">{banner.message}</span>
    </div>
  );
};
