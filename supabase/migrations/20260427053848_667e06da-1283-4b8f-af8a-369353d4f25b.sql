CREATE OR REPLACE FUNCTION public.restart_journey()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_tz text;
  v_current_day int;
  v_final_done boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT COALESCE(timezone, 'UTC') INTO v_user_tz
  FROM public.profiles WHERE id = v_user_id;

  v_current_day := public.get_current_day(v_user_id);

  SELECT EXISTS (
    SELECT 1 FROM public.audio_progress
    WHERE user_id = v_user_id AND day_number = 365 AND completed = true
  ) INTO v_final_done;

  IF v_current_day < 365 OR NOT v_final_done THEN
    RAISE EXCEPTION 'Cannot restart journey: you must finish the day 365 audio first.';
  END IF;

  -- Wipe progress and streak so the new cycle is a true restart.
  DELETE FROM public.audio_progress WHERE user_id = v_user_id;

  -- New journey starts TOMORROW in the user's local timezone, so they don't
  -- need to listen to two audios on the same day (today they already finished
  -- the previous day-365 audio).
  UPDATE public.profiles
  SET start_date = ((timezone(v_user_tz, now()))::date + 1),
      journey_completions = COALESCE(journey_completions, 0) + 1,
      best_streak = 0,
      updated_at = now()
  WHERE id = v_user_id;
END;
$function$;