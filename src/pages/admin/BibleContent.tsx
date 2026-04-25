import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Library } from "lucide-react";
import { toast } from "sonner";

interface Row {
  translation: string;
  verse_count: number;
}

const TRANSLATIONS = ["bsb", "kjv", "acf", "rvr1909"] as const;
const TARGET = 23000;

const BibleContent = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [reimporting, setReimporting] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_get_translation_counts");
      if (error) throw error;
      setRows((data ?? []) as Row[]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const reimport = async (t: string) => {
    if (!confirm(`Re-import ${t.toUpperCase()}? This may take a few minutes.`)) return;
    setReimporting(t);
    try {
      const { error } = await supabase.functions.invoke("import-bible", {
        body: { translation: t, force: true },
      });
      if (error) throw error;
      toast.success(`${t.toUpperCase()} re-imported`);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setReimporting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-foreground">Bible Content</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage Bible translations available in the app.
        </p>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TRANSLATIONS.map((t) => {
            const r = rows.find((x) => x.translation === t);
            const count = r ? Number(r.verse_count) : 0;
            const ok = count >= TARGET;
            return (
              <Card key={t} className="border-border/40 bg-card/40 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base uppercase tracking-[0.2em]">
                    <span className="flex items-center gap-2">
                      <Library className="h-4 w-4 text-primary" />
                      {t}
                    </span>
                    <span
                      className={`text-[10px] ${ok ? "text-primary" : "text-destructive"}`}
                    >
                      {ok ? "Complete" : "Incomplete"}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-display text-3xl text-foreground tabular-nums">{count}</p>
                  <p className="text-xs text-muted-foreground">verses imported</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 w-full"
                    onClick={() => reimport(t)}
                    disabled={reimporting === t}
                  >
                    {reimporting === t ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Re-import
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BibleContent;
