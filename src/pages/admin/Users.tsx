import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { ShieldCheck, ShieldOff, RotateCcw, Search, Download, Loader2, Eye } from "lucide-react";
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

const Users = () => {
  const { user: me } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = async (q: string, p: number) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_list_users", {
        _search: q || null,
        _limit: PAGE,
        _offset: p * PAGE,
      });
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
    void load(search, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(0);
      void load(search, 0);
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
      void load(search, page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const resetStreak = async (u: AdminUser) => {
    try {
      const { error } = await supabase.rpc("admin_reset_user_streak", { _user_id: u.id });
      if (error) throw error;
      toast.success("Streak reset");
      void load(search, page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const exportCsv = () => {
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
    const lines = rows.map((r) =>
      header
        .map((k) => {
          const v = (r as unknown as Record<string, unknown>)[k] ?? "";
          const s = String(v).replace(/"/g, '""');
          return `"${s}"`;
        })
        .join(","),
    );
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users-page-${page + 1}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-foreground">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} total · page {page + 1} of {totalPages}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="mr-1.5 h-3.5 w-3.5" /> Export page (CSV)
          </Button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email or name…"
          className="pl-9"
        />
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
                  No users found.
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
    </div>
  );
};

export default Users;
