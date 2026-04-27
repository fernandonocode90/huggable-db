-- 1. Add journey_completions counter to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS journey_completions integer NOT NULL DEFAULT 0;

-- 2. Function: restart the user's journey (reset start_date to today, bump completions)
CREATE OR REPLACE FUNCTION public.restart_journey()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_tz text;
  v_today date;
  v_current_day int;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT COALESCE(timezone, 'UTC') INTO v_tz FROM public.profiles WHERE id = v_user;
  IF v_tz IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  v_today := (timezone(v_tz, now()))::date;
  v_current_day := public.get_current_day(v_user);

  -- Only allow restart if the user actually finished the 365-day journey
  IF v_current_day < 365 THEN
    RAISE EXCEPTION 'Journey not yet completed';
  END IF;

  -- Bypass the protect_profile_sensitive_fields trigger by updating directly
  -- as a SECURITY DEFINER function (the trigger only blocks non-admin clients).
  UPDATE public.profiles
     SET start_date = v_today,
         journey_completions = COALESCE(journey_completions, 0) + 1,
         updated_at = now()
   WHERE id = v_user;
END;
$$;

-- The protect_profile_sensitive_fields trigger blocks non-admin updates to start_date.
-- Since restart_journey runs as SECURITY DEFINER but the trigger checks auth.uid(),
-- we need the trigger to also allow updates coming from this specific path.
-- Simpler approach: have the trigger respect a per-session GUC set by restart_journey.
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins can always change protected fields
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- Allow restart_journey to modify start_date (it sets this GUC)
  IF current_setting('app.allow_journey_restart', true) = 'on' THEN
    RETURN NEW;
  END IF;

  -- Lock fields that gate content access / streaks
  IF NEW.start_date IS DISTINCT FROM OLD.start_date THEN
    NEW.start_date := OLD.start_date;
  END IF;
  IF NEW.best_streak IS DISTINCT FROM OLD.best_streak THEN
    NEW.best_streak := OLD.best_streak;
  END IF;

  RETURN NEW;
END;
$$;

-- Update restart_journey to set the GUC before updating
CREATE OR REPLACE FUNCTION public.restart_journey()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_tz text;
  v_today date;
  v_current_day int;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT COALESCE(timezone, 'UTC') INTO v_tz FROM public.profiles WHERE id = v_user;
  IF v_tz IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  v_today := (timezone(v_tz, now()))::date;
  v_current_day := public.get_current_day(v_user);

  IF v_current_day < 365 THEN
    RAISE EXCEPTION 'Journey not yet completed';
  END IF;

  -- Allow the protect_profile_sensitive_fields trigger to permit this update
  PERFORM set_config('app.allow_journey_restart', 'on', true);

  UPDATE public.profiles
     SET start_date = v_today,
         journey_completions = COALESCE(journey_completions, 0) + 1,
         updated_at = now()
   WHERE id = v_user;

  PERFORM set_config('app.allow_journey_restart', 'off', true);
END;
$$;

-- 3. Update RLS on daily_audios: veterans see everything
DROP POLICY IF EXISTS "Users see audios up to their current day" ON public.daily_audios;
CREATE POLICY "Users see audios up to their current day or all if veteran"
ON public.daily_audios
FOR SELECT
TO authenticated
USING (
  day_number IS NOT NULL
  AND (
    -- Veterans (completed at least one journey) see everything
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND COALESCE(p.journey_completions, 0) >= 1
    )
    OR
    -- Otherwise: only up to their current day (existing behavior)
    day_number <= (
      SELECT (((timezone(COALESCE(p.timezone, 'UTC'), now()))::date - p.start_date) + 1)
      FROM public.profiles p WHERE p.id = auth.uid()
    )
  )
);

-- 4. Update RLS on daily_devotionals: same rule
DROP POLICY IF EXISTS "Users see devotionals up to their current day" ON public.daily_devotionals;
CREATE POLICY "Users see devotionals up to current day or all if veteran"
ON public.daily_devotionals
FOR SELECT
TO authenticated
USING (
  day_number IS NOT NULL
  AND (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND COALESCE(p.journey_completions, 0) >= 1
    )
    OR
    day_number <= (
      SELECT (((timezone(COALESCE(p.timezone, 'UTC'), now()))::date - p.start_date) + 1)
      FROM public.profiles p WHERE p.id = auth.uid()
    )
  )
);