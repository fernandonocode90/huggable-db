
CREATE OR REPLACE FUNCTION public.admin_get_dropoff_by_day()
RETURNS TABLE(
  day_number INTEGER,
  title TEXT,
  reached BIGINT,
  completed BIGINT,
  dropoff_rate NUMERIC
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  RETURN QUERY
  WITH user_days AS (
    SELECT p.id AS user_id,
           public.get_current_day(p.id) AS current_day
    FROM public.profiles p
  ),
  audios AS (
    SELECT a.day_number, a.title
    FROM public.daily_audios a
    WHERE a.day_number IS NOT NULL
  )
  SELECT
    a.day_number,
    a.title,
    COALESCE((SELECT count(*) FROM user_days ud WHERE ud.current_day >= a.day_number), 0)::bigint AS reached,
    COALESCE((SELECT count(DISTINCT ap.user_id) FROM public.audio_progress ap
              WHERE ap.day_number = a.day_number AND ap.completed = true), 0)::bigint AS completed,
    CASE
      WHEN (SELECT count(*) FROM user_days ud WHERE ud.current_day >= a.day_number) > 0
      THEN round(
        (1 - (
          (SELECT count(DISTINCT ap.user_id) FROM public.audio_progress ap
           WHERE ap.day_number = a.day_number AND ap.completed = true)::numeric
          /
          (SELECT count(*) FROM user_days ud WHERE ud.current_day >= a.day_number)::numeric
        )) * 100, 1)
      ELSE 0
    END AS dropoff_rate
  FROM audios a
  ORDER BY a.day_number;
END;
$$;
