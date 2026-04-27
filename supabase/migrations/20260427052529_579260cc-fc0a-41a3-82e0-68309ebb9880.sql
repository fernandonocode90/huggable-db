-- Reset audio progress and best_streak when a user restarts their journey,
-- so the new cycle requires them to listen to every day again (including day 365).
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

  UPDATE public.profiles
  SET start_date = (timezone(v_user_tz, now()))::date,
      journey_completions = COALESCE(journey_completions, 0) + 1,
      best_streak = 0,
      updated_at = now()
  WHERE id = v_user_id;
END;
$function$;

-- When an admin manually moves a user to an earlier day, clear any progress
-- from that day onward so the user must listen again to advance.
CREATE OR REPLACE FUNCTION public.admin_set_user_day(_user_id uuid, _new_day integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE user_tz TEXT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;
  IF _new_day < 1 OR _new_day > 1000 THEN
    RAISE EXCEPTION 'Invalid day value';
  END IF;
  SELECT COALESCE(timezone, 'UTC') INTO user_tz FROM public.profiles WHERE id = _user_id;

  UPDATE public.profiles
  SET start_date = (timezone(user_tz, now()))::date - (_new_day - 1)
  WHERE id = _user_id;

  -- Clear any completion records from the new current day onward, so the user
  -- must actually listen to those days again to progress / finish the journey.
  DELETE FROM public.audio_progress
  WHERE user_id = _user_id AND day_number >= _new_day;

  PERFORM public.log_admin_action('set_user_day', 'user', _user_id::text,
    jsonb_build_object('new_day', _new_day));
END;
$function$;