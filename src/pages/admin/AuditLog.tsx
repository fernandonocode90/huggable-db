import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ScrollText, Search } from "lucide-react";
import { toast } from "sonner";

interface LogEntry {
  id: string;
  admin_id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface AdminProfile {
  id: string;
  display_name: string | null;
}

const AuditLog = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [admins, setAdmins] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("admin_audit_log")
          .select("id,admin_id,action,entity_type,entity_id,metadata,created_at")
          .order("created_at", { ascending: false })
          .limit(200);
        if (error) throw error;
        const list = (data ?? []) as LogEntry[];
        setLogs(list);

        const ids = Array.from(new Set(list.map((l) => l.admin_id)));
        if (ids.length > 0) {
          const { data: profs } = await supabase
            .from("profiles")
            .select("id,display_name")
            .in("id", ids);
          const map = new Map<string, string>();
          (profs ?? []).forEach((p: AdminProfile) => {
            map.set(p.id, p.display_name ?? p.id.slice(0, 8));
          });
          setAdmins(map);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = logs.filter((l) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      l.action.toLowerCase().includes(q) ||
      (l.entity_type ?? "").toLowerCase().includes(q) ||
      (l.entity_id ?? "").toLowerCase().includes(q) ||
      (admins.get(l.admin_id) ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-foreground">Audit Log</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Last 200 admin actions. Sensitive operations are recorded automatically.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by action, admin or entity…"
          className="pl-9"
        />
      </div>

      <Card className="border-border/40 bg-card/40 backdrop-blur">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    <ScrollText className="mx-auto mb-2 h-6 w-6 opacity-40" />
                    No audit entries yet.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(l.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs">
                      {admins.get(l.admin_id) ?? l.admin_id.slice(0, 8)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        {l.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {l.entity_type ? (
                        <>
                          <span className="text-muted-foreground">{l.entity_type}</span>{" "}
                          <span className="font-mono">{l.entity_id?.slice(0, 8)}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate font-mono text-[10px] text-muted-foreground">
                      {l.metadata && Object.keys(l.metadata).length > 0
                        ? JSON.stringify(l.metadata)
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLog;
