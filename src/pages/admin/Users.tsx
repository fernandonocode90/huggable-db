import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { ShieldCheck, ShieldOff, RotateCcw, Search, Download, Loader2, Eye, Trash2, Gift } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface AdminUser {
  id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  best_streak: number;
  current_streak: number;
  current_day: number;
  total_completions: number;
  is_admin: boolean;
  total_count: number;
}

const PAGE = 25;

type Segment =
  | "all"
  | "inactive_7d"
  | "inactive_30d"
  | "completed_30plus"
  | "stuck_at_day"
  | "admins";

const SEGMENT_LABEL: Record<Segment, string> = {
  all: "Todos",
  inactive_7d: "Inativos 7+ dias",
  inactive_30d: "Inativos 30+ dias",
  completed_30plus: "Super-fãs (30+ completos)",
  stuck_at_day: "Parados num dia X",
  admins: "Admins",
};

const Users = () => {
  const { user: me } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [segment, setSegment] = useState<Segment>("all");
  const [stuckDay, setStuckDay] = useState<string>("3");
  const [exporting, setExporting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  const deleteUser = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("admin-delete-user", {
        body: { user_id: deleteTarget.id },
      });
      if (error) throw error;
      if ((res as { error?: string })?.error) throw new Error((res as { error: string }).error);
      toast.success("Usuário deletado");
      setDeleteTarget(null);
      setDeleteConfirm("");
      void load(search, page, segment, stuckDay);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao deletar");
    } finally {
      setDeleting(false);
    }
  };

  const callList = (q: string, p: number, seg: Segment, sd: string, limit = PAGE) =>
    supabase.rpc("admin_list_users_segmented", {
      _search: q || null,
      _segment: seg === "all" ? null : seg,
      _stuck_day: seg === "stuck_at_day" ? Number(sd) || null : null,
      _limit: limit,
      _offset: p * PAGE,
    });

  const load = async (q: string, p: number, seg: Segment, sd: string) => {
    setLoading(true);
    try {
      const { data, error } = await callList(q, p, seg, sd);
      if (error) throw error;
      const list = (data ?? []) as AdminUser[];
      setRows(list);
      setTotal(list[0]?.total_count ? Number(list[0].total_count) : 0);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(search, page, segment, stuckDay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, segment, stuckDay]);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(0);
      void load(search, 0, segment, stuckDay);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const toggleAdmin = async (u: AdminUser) => {
    try {
      const { error } = await supabase.rpc("admin_set_user_role", {
        _user_id: u.id,
        _make_admin: !u.is_admin,
      });
      if (error) throw error;
      toast.success(u.is_admin ? "Admin role removed" : "Promoted to admin");
      void load(search, page, segment, stuckDay);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const resetStreak = async (u: AdminUser) => {
    try {
      const { error } = await supabase.rpc("admin_reset_user_streak", { _user_id: u.id });
      if (error) throw error;
      toast.success("Streak reset");
      void load(search, page, segment, stuckDay);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const buildCsv = (list: AdminUser[]) => {
    const header = [
      "id",
      "email",
      "display_name",
      "created_at",
      "last_sign_in_at",
      "current_day",
      "current_streak",
      "best_streak",
      "total_completions",
      "is_admin",
    ];
    const lines = list.map((r) =>
      header
        .map((k) => {
          const v = (r as unknown as Record<string, unknown>)[k] ?? "";
          const s = String(v).replace(/"/g, '""');
          return `"${s}"`;
        })
        .join(","),
    );
    return [header.join(","), ...lines].join("\n");
  };

  const downloadBlob = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCurrentPage = () => {
    downloadBlob(buildCsv(rows), `users-page-${page + 1}.csv`);
  };

  /** Exports ALL filtered users (paginated under the hood). */
  const exportAll = async () => {
    if (total === 0) return;
    setExporting(true);
    try {
      const all: AdminUser[] = [];
      const pageSize = 500;
      const pages = Math.ceil(total / pageSize);
      for (let i = 0; i < pages; i++) {
        const { data, error } = await supabase.rpc("admin_list_users_segmented", {
          _search: search || null,
          _segment: segment === "all" ? null : segment,
          _stuck_day: segment === "stuck_at_day" ? Number(stuckDay) || null : null,
          _limit: pageSize,
          _offset: i * pageSize,
        });
        if (error) throw error;
        all.push(...((data ?? []) as AdminUser[]));
      }
      const stamp = new Date().toISOString().slice(0, 10);
      downloadBlob(
        buildCsv(all),
        `users-${segment}-${stamp}.csv`,
      );
      toast.success(`Exportados ${all.length} usuários`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao exportar");
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-foreground">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} {SEGMENT_LABEL[segment].toLowerCase()} · página {page + 1} de {totalPages}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCurrentPage} disabled={rows.length === 0}>
            <Download className="mr-1.5 h-3.5 w-3.5" /> Página (CSV)
          </Button>
          <Button variant="outline" size="sm" onClick={exportAll} disabled={exporting || total === 0}>
            {exporting ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="mr-1.5 h-3.5 w-3.5" />
            )}
            Tudo ({total})
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-md flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por email ou nome…"
            className="pl-9"
          />
        </div>

        <Select
          value={segment}
          onValueChange={(v) => {
            setSegment(v as Segment);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-[230px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(SEGMENT_LABEL) as Segment[]).map((s) => (
              <SelectItem key={s} value={s}>
                {SEGMENT_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {segment === "stuck_at_day" && (
          <Input
            type="number"
            min={1}
            value={stuckDay}
            onChange={(e) => {
              setStuckDay(e.target.value);
              setPage(0);
            }}
            className="w-24"
            placeholder="Dia"
          />
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-border/40 bg-card/40 backdrop-blur">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Last login</TableHead>
              <TableHead className="text-right">Day</TableHead>
              <TableHead className="text-right">Streak</TableHead>
              <TableHead className="text-right">Best</TableHead>
              <TableHead className="text-right">Done</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum usuário neste segmento.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="font-medium text-foreground">
                      {u.display_name || "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">{u.email ?? "—"}</div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {u.last_sign_in_at
                      ? new Date(u.last_sign_in_at).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{u.current_day}</TableCell>
                  <TableCell className="text-right tabular-nums">{u.current_streak}</TableCell>
                  <TableCell className="text-right tabular-nums">{u.best_streak}</TableCell>
                  <TableCell className="text-right tabular-nums">{u.total_completions}</TableCell>
                  <TableCell>
                    {u.is_admin ? (
                      <Badge variant="default" className="bg-primary/20 text-primary hover:bg-primary/20">
                        Admin
                      </Badge>
                    ) : (
                      <Badge variant="secondary">User</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Ver detalhes"
                        onClick={() => navigate(`/admin/users/${u.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={u.id === me?.id && u.is_admin}
                            title={u.is_admin ? "Remove admin" : "Promote to admin"}
                          >
                            {u.is_admin ? (
                              <ShieldOff className="h-4 w-4" />
                            ) : (
                              <ShieldCheck className="h-4 w-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              {u.is_admin ? "Remove admin role?" : "Promote to admin?"}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {u.is_admin
                                ? `${u.email} will lose admin access.`
                                : `${u.email} will gain full access to the admin console.`}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => toggleAdmin(u)}>
                              Confirm
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" title="Reset streak">
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Reset streak?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Resets best streak to 0 and start date to today for {u.email}.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => resetStreak(u)}>
                              Reset
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      {u.id !== me?.id && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Deletar usuário"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            setDeleteTarget(u);
                            setDeleteConfirm("");
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

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
          Showing {rows.length === 0 ? 0 : page * PAGE + 1}–{page * PAGE + rows.length} of {total}
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

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteConfirm("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar {deleteTarget?.email} para sempre?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove a conta do Supabase Auth + todos os dados. O email fica livre para se cadastrar
              novamente. Para confirmar, digite o email abaixo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            placeholder={deleteTarget?.email ?? ""}
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            autoComplete="off"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={
                deleting ||
                deleteConfirm.trim().toLowerCase() !== (deleteTarget?.email ?? "").toLowerCase()
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void deleteUser();
              }}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Deletar para sempre"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Users;
