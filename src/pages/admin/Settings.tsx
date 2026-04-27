import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Wrench, Megaphone, Save, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAppSettings } from "@/hooks/useAppSettings";

const Settings = () => {
  const { refresh } = useAppSettings();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const [maintEnabled, setMaintEnabled] = useState(false);
  const [maintMessage, setMaintMessage] = useState("");

  const [bannerEnabled, setBannerEnabled] = useState(false);
  const [bannerMessage, setBannerMessage] = useState("");
  const [bannerVariant, setBannerVariant] = useState<"info" | "warning" | "success">("info");

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value");
      if (error) throw error;
      for (const row of data ?? []) {
        const v = row.value as Record<string, unknown>;
        if (row.key === "maintenance") {
          setMaintEnabled(Boolean(v.enabled));
          setMaintMessage(String(v.message ?? ""));
        }
        if (row.key === "global_banner") {
          setBannerEnabled(Boolean(v.enabled));
          setBannerMessage(String(v.message ?? ""));
          setBannerVariant((v.variant as "info" | "warning" | "success") ?? "info");
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async (key: "maintenance" | "global_banner", value: Record<string, unknown>) => {
    setSaving(key);
    try {
      const { error } = await supabase.rpc("admin_set_app_setting", {
        _key: key,
        _value: value as never,
      });
      if (error) throw error;
      toast.success("Configuração salva");
      void refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Controles globais que afetam todos os usuários do app.
        </p>
      </div>

      {/* Maintenance Mode */}
      <Card className="p-6 bg-card/40 backdrop-blur border-border/40">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-amber-500/15 p-2">
              <Wrench className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h2 className="font-medium text-foreground">Modo manutenção</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Quando ativo, todos os usuários (exceto admins) verão uma tela de manutenção.
              </p>
            </div>
          </div>
          <Switch checked={maintEnabled} onCheckedChange={setMaintEnabled} />
        </div>

        <div className="space-y-3">
          <Label htmlFor="maint-msg">Mensagem exibida</Label>
          <Textarea
            id="maint-msg"
            value={maintMessage}
            onChange={(e) => setMaintMessage(e.target.value)}
            placeholder="Estamos em manutenção. Voltamos em breve."
            rows={3}
          />
          <Button
            onClick={() => save("maintenance", { enabled: maintEnabled, message: maintMessage })}
            disabled={saving === "maintenance"}
            size="sm"
          >
            {saving === "maintenance" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salvar manutenção
          </Button>
        </div>
      </Card>

      {/* Global Banner */}
      <Card className="p-6 bg-card/40 backdrop-blur border-border/40">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/15 p-2">
              <Megaphone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-medium text-foreground">Banner global</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Faixa exibida no topo do app para todos os usuários autenticados.
              </p>
            </div>
          </div>
          <Switch checked={bannerEnabled} onCheckedChange={setBannerEnabled} />
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="banner-msg">Mensagem</Label>
            <Input
              id="banner-msg"
              value={bannerMessage}
              onChange={(e) => setBannerMessage(e.target.value)}
              placeholder="Hoje tem áudio especial às 20h"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="banner-variant">Tipo</Label>
            <Select value={bannerVariant} onValueChange={(v) => setBannerVariant(v as "info" | "warning" | "success")}>
              <SelectTrigger id="banner-variant" className="mt-1.5 w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Informação (azul)</SelectItem>
                <SelectItem value="warning">Aviso (amarelo)</SelectItem>
                <SelectItem value="success">Sucesso (verde)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() =>
              save("global_banner", {
                enabled: bannerEnabled,
                message: bannerMessage,
                variant: bannerVariant,
              })
            }
            disabled={saving === "global_banner"}
            size="sm"
          >
            {saving === "global_banner" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salvar banner
          </Button>
        </div>
      </Card>

      {/* Cache control */}
      <Card className="p-6 bg-card/40 backdrop-blur border-border/40">
        <div className="flex items-start gap-3 mb-4">
          <div className="rounded-lg bg-sky-500/15 p-2">
            <RefreshCw className="h-5 w-5 text-sky-400" />
          </div>
          <div>
            <h2 className="font-medium text-foreground">Cache do app</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Use quando os usuários estiverem vendo uma versão antiga do app após uma atualização.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-border/40 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-medium text-sm text-foreground">Publicar nova versão</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Recomendado. Os apps abertos detectam em até 1 minuto e recarregam sozinhos
                  (sem perder login). Use sempre que subir uma alteração no app.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={saving === "app_version"}
                onClick={async () => {
                  setSaving("app_version");
                  try {
                    const { error } = await supabase.rpc("admin_bump_app_version");
                    if (error) throw error;
                    toast.success("Nova versão publicada — usuários recarregam em até 1 min");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Falhou");
                  } finally {
                    setSaving(null);
                  }
                }}
              >
                {saving === "app_version" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Publicar versão
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-medium text-sm text-foreground">Forçar limpeza total</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Emergência. Limpa service worker, cache de assets e dados de sessão de
                  todos os usuários, e recarrega. Use só se "Publicar nova versão" não resolver.
                </p>
              </div>
              <Button
                size="sm"
                variant="destructive"
                disabled={saving === "force_clear"}
                onClick={async () => {
                  if (!confirm("Forçar limpeza total para TODOS os usuários agora?")) return;
                  setSaving("force_clear");
                  try {
                    const { error } = await supabase.rpc("admin_force_clear_cache");
                    if (error) throw error;
                    toast.success("Limpeza disparada — usuários recarregam em até 1 min");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Falhou");
                  } finally {
                    setSaving(null);
                  }
                }}
              >
                {saving === "force_clear" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Forçar limpeza
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Settings;
