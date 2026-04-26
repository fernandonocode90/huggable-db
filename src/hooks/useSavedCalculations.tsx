import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export type CalculatorKey =
  | "debt_snowball"
  | "budget"
  | "goal_planner"
  | "retirement"
  | "mortgage"
  | "tithe"
  | "loan_payoff"
  | "true_cost"
  | "generosity"
  | "compound_interest"
  | "emergency_fund";

export interface SavedCalculation<TInputs = unknown, TSnapshot = unknown> {
  id: string;
  user_id: string;
  calculator: CalculatorKey;
  name: string;
  inputs: TInputs;
  snapshot: TSnapshot;
  created_at: string;
  updated_at: string;
}

/**
 * Hook to list, save, update, and delete the user's saved scenarios for a single calculator.
 * Requires the user to be authenticated; returns `requiresAuth: true` otherwise.
 */
export function useSavedCalculations<TInputs, TSnapshot>(calculator: CalculatorKey) {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<SavedCalculation<TInputs, TSnapshot>[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("saved_calculations")
      .select("*")
      .eq("calculator", calculator)
      .order("updated_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast({
        title: "Couldn't load your saved scenarios",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    setItems((data ?? []) as unknown as SavedCalculation<TInputs, TSnapshot>[]);
  }, [user, calculator, toast]);

  useEffect(() => {
    if (!authLoading) refresh();
  }, [authLoading, refresh]);

  const save = useCallback(
    async (name: string, inputs: TInputs, snapshot: TSnapshot) => {
      if (!user) return null;
      const trimmed = name.trim();
      if (!trimmed) {
        toast({ title: "Give your scenario a name", variant: "destructive" });
        return null;
      }
      const { data, error } = await supabase
        .from("saved_calculations")
        .insert({
          user_id: user.id,
          calculator,
          name: trimmed.slice(0, 80),
          inputs: inputs as never,
          snapshot: snapshot as never,
        })
        .select()
        .single();
      if (error) {
        toast({
          title: "Couldn't save",
          description: error.message,
          variant: "destructive",
        });
        return null;
      }
      toast({ title: "Saved", description: `"${trimmed}" is in your library.` });
      await refresh();
      return data as unknown as SavedCalculation<TInputs, TSnapshot>;
    },
    [user, calculator, refresh, toast],
  );

  const update = useCallback(
    async (id: string, patch: Partial<Pick<SavedCalculation<TInputs, TSnapshot>, "name" | "inputs" | "snapshot">>) => {
      if (!user) return false;
      const payload: {
        name?: string;
        inputs?: never;
        snapshot?: never;
      } = {};
      if (patch.name !== undefined) payload.name = patch.name.trim().slice(0, 80);
      if (patch.inputs !== undefined) payload.inputs = patch.inputs as never;
      if (patch.snapshot !== undefined) payload.snapshot = patch.snapshot as never;
      const { error } = await supabase
        .from("saved_calculations")
        .update(payload)
        .eq("id", id);
      if (error) {
        toast({
          title: "Couldn't update",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }
      toast({ title: "Updated" });
      await refresh();
      return true;
    },
    [user, refresh, toast],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!user) return false;
      const { error } = await supabase.from("saved_calculations").delete().eq("id", id);
      if (error) {
        toast({
          title: "Couldn't delete",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }
      toast({ title: "Removed from your library" });
      await refresh();
      return true;
    },
    [user, refresh, toast],
  );

  return {
    items,
    loading,
    requiresAuth: !user && !authLoading,
    refresh,
    save,
    update,
    remove,
  };
}
