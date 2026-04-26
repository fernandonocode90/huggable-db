-- Generic store for personalized calculator results.
-- Each row is one named scenario the user wants to keep around.
CREATE TABLE public.saved_calculations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  calculator TEXT NOT NULL,
  name TEXT NOT NULL,
  inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT saved_calculations_calculator_check
    CHECK (calculator IN (
      'debt_snowball', 'budget', 'goal_planner', 'retirement',
      'mortgage', 'tithe', 'loan_payoff', 'true_cost',
      'generosity', 'compound_interest', 'emergency_fund'
    )),
  CONSTRAINT saved_calculations_name_length CHECK (char_length(name) BETWEEN 1 AND 80)
);

-- Indexes for the two main access patterns: list mine, and list mine for one calculator.
CREATE INDEX idx_saved_calculations_user_calc
  ON public.saved_calculations (user_id, calculator, updated_at DESC);

ALTER TABLE public.saved_calculations ENABLE ROW LEVEL SECURITY;

-- Users manage only their own saves
CREATE POLICY "Users read own saved calculations"
  ON public.saved_calculations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own saved calculations"
  ON public.saved_calculations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own saved calculations"
  ON public.saved_calculations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own saved calculations"
  ON public.saved_calculations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can read all (for support / debugging)
CREATE POLICY "Admins read all saved calculations"
  ON public.saved_calculations FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Cap at 50 saves per (user, calculator) — keeps the list usable and prevents abuse.
CREATE OR REPLACE FUNCTION public.enforce_saved_calculations_quota()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.saved_calculations
  WHERE user_id = NEW.user_id AND calculator = NEW.calculator;
  IF v_count >= 50 THEN
    RAISE EXCEPTION 'You can save up to 50 scenarios per calculator. Delete an older one first.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_saved_calculations_quota
  BEFORE INSERT ON public.saved_calculations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_saved_calculations_quota();

-- Auto-touch updated_at on edits (reuses the existing helper)
CREATE TRIGGER trg_saved_calculations_updated_at
  BEFORE UPDATE ON public.saved_calculations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();