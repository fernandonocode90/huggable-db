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
  v_day365_done boolean;
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

  -- Require that the user actually finished the day-365 audio before restarting.
  SELECT EXISTS (
    SELECT 1 FROM public.audio_progress
    WHERE user_id = v_user AND day_number = 365 AND completed = true
  ) INTO v_day365_done;

  IF NOT v_day365_done THEN
    RAISE EXCEPTION 'Finish day 365 before restarting the journey';
  END IF;

  PERFORM set_config('app.allow_journey_restart', 'on', true);

  UPDATE public.profiles
     SET start_date = v_today,
         journey_completions = COALESCE(journey_completions, 0) + 1,
         updated_at = now()
   WHERE id = v_user;

  PERFORM set_config('app.allow_journey_restart', 'off', true);
END;
$$;