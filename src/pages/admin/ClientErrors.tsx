import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle, Loader2, RefreshCw, Eye } from "lucide-react";
import { toast } from "sonner";

interface ErrorRow {
  id: string;
  user_id: string | null;
  user_email: string | null;
  message: string;
  stack: string | null;
  route: string | null;
  user_agent: string | null;
  app_version: string | null;
  created_at: string;
  total_count: number;
}

const PAGE = 50;

const ClientErrors = () => {
  const [rows, setRows] = useState<ErrorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState<ErrorRow | null>(null);

  const load = async (p = page) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_list_client_errors", {
        _limit: PAGE,
        _offset: p * PAGE,
      });
      if (error) throw error;
      const list = (data ?? []) as ErrorRow[];
      setRows(list);
      setTotal(list[0]?.total_count ? Number(list[0].total_count) : 0);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao carregar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-foreground">Client Errors</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} erros capturados pelo ErrorBoundary do app.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => load(page)}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Atualizar
        </Button>
      </div>

      <Card className="border-border/40 bg-card/40 backdrop-blur">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[160px]">Quando</TableHead>
                <TableHead>Mensagem</TableHead>
                <TableHead className="w-[180px]">Rota</TableHead>
                <TableHead className="w-[200px]">Usuário</TableHead>
                <TableHead className="w-[60px] text-right">Ver</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    Nenhum erro registrado. 🎉
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs text-muted-foreground tabular-nums">
                      {new Date(r.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-destructive" />
                        <span className="line-clamp-2">{r.message}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.route ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.user_email ?? <span className="text-muted-foreground">anônimo</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => setOpen(r)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          disabled={page === 0 || loading}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >
          Previous
        </Button>
        <span className="text-xs text-muted-foreground">
          Página {page + 1} de {Math.max(1, Math.ceil(total / PAGE))}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={(page + 1) * PAGE >= total || loading}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </Button>
      </div>

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">Detalhes do erro</DialogTitle>
          </DialogHeader>
          {open && (
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-muted-foreground">Quando: </span>
                <span className="font-mono">{new Date(open.created_at).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Rota: </span>
                <span className="font-mono">{open.route ?? "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Usuário: </span>
                <span className="font-mono">{open.user_email ?? "anônimo"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Browser: </span>
                <span className="font-mono break-all">{open.user_agent ?? "—"}</span>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Mensagem:</p>
                <pre className="rounded-md border border-border/40 bg-background/40 p-3 font-mono whitespace-pre-wrap break-all">
                  {open.message}
                </pre>
              </div>
              {open.stack && (
                <div>
                  <p className="text-muted-foreground mb-1">Stack:</p>
                  <pre className="max-h-[40vh] overflow-auto rounded-md border border-border/40 bg-background/40 p-3 font-mono whitespace-pre-wrap break-all">
                    {open.stack}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientErrors;
