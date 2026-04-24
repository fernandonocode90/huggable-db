import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Search, Trash2, MessageSquare } from "lucide-react";
import { toast } from "sonner";

interface NoteRow {
  id: string;
  user_id: string;
  user_email: string | null;
  display_name: string | null;
  book_name: string;
  chapter: number;
  verse: number;
  translation: string;
  note: string;
  verse_text: string | null;
  created_at: string;
  total_count: number;
}

const PAGE = 50;

const Moderation = () => {
  const [rows, setRows] = useState<NoteRow[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = async (q: string, p: number) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_list_bookmark_notes", {
        _search: q || null,
        _limit: PAGE,
        _offset: p * PAGE,
      });
      if (error) throw error;
      const list = (data ?? []) as NoteRow[];
      setRows(list);
      setTotal(list[0]?.total_count ? Number(list[0].total_count) : 0);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao carregar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(search, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(0);
      void load(search, 0);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const clearNote = async (row: NoteRow) => {
    try {
      const { error } = await supabase.rpc("admin_clear_bookmark_note", {
        _bookmark_id: row.id,
      });
      if (error) throw error;
      toast.success("Nota removida");
      void load(search, page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao remover");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-foreground">Moderação de notas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {total} notas escritas por usuários nos seus marcadores. Remova conteúdo abusivo.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar no texto da nota ou livro…"
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Nenhuma nota encontrada.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id} className="border-border/40 bg-card/40 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span className="font-medium text-foreground">
                        {r.book_name} {r.chapter}:{r.verse}
                      </span>
                      <span>·</span>
                      <span className="uppercase">{r.translation}</span>
                      <span>·</span>
                      <span>{new Date(r.created_at).toLocaleDateString()}</span>
                      <span>·</span>
                      <span>
                        {r.display_name ?? "—"} ({r.user_email ?? "—"})
                      </span>
                    </div>
                    {r.verse_text && (
                      <p className="mt-2 text-xs italic text-muted-foreground line-clamp-2">
                        “{r.verse_text}”
                      </p>
                    )}
                    <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                      {r.note}
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        title="Remover nota"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover esta nota?</AlertDialogTitle>
                        <AlertDialogDescription>
                          O marcador do versículo será mantido, mas o texto da nota será apagado. A ação fica registrada no audit log.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => clearNote(r)}>
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
    </div>
  );
};

export default Moderation;
