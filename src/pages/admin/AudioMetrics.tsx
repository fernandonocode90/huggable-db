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
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Metric {
  audio_id: string;
  day_number: number | null;
  title: string;
  total_plays: number;
  completions: number;
  avg_progress: number;
  completion_rate: number;
}

export const AudioMetrics = () => {
  const [rows, setRows] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.rpc("admin_get_audio_metrics");
        if (error) throw error;
        setRows((data ?? []) as Metric[]);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <Card className="border-border/40 bg-card/40 backdrop-blur">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Day</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="text-right">Plays</TableHead>
              <TableHead className="text-right">Completed</TableHead>
              <TableHead className="text-right">Avg progress</TableHead>
              <TableHead className="text-right">Completion %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  No audios yet.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((m) => (
                <TableRow key={m.audio_id}>
                  <TableCell className="tabular-nums">{m.day_number ?? "—"}</TableCell>
                  <TableCell className="max-w-md truncate">{m.title}</TableCell>
                  <TableCell className="text-right tabular-nums">{m.total_plays}</TableCell>
                  <TableCell className="text-right tabular-nums">{m.completions}</TableCell>
                  <TableCell className="text-right tabular-nums">{m.avg_progress}%</TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span
                      className={
                        m.completion_rate >= 50
                          ? "text-primary"
                          : m.completion_rate >= 20
                            ? "text-foreground"
                            : "text-muted-foreground"
                      }
                    >
                      {m.completion_rate}%
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default AudioMetrics;
