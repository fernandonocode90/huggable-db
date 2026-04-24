import { ReactNode } from "react";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useAuth } from "@/hooks/useAuth";
import { Wrench } from "lucide-react";

/** Blocks the app when maintenance mode is on. Admins always pass through. */
export const MaintenanceGate = ({ children }: { children: ReactNode }) => {
  const { settings, loading } = useAppSettings();
  const { isAdmin } = useAuth();

  if (loading) return <>{children}</>;
  if (!settings.maintenance.enabled || isAdmin) return <>{children}</>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Wrench className="h-7 w-7 text-primary" />
        </div>
        <h1 className="font-display text-2xl text-foreground">Em manutenção</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {settings.maintenance.message || "Estamos fazendo melhorias. Voltamos em breve."}
        </p>
      </div>
    </div>
  );
};
