CREATE OR REPLACE FUNCTION public.get_audio_preview(_day int)
RETURNS TABLE (
  day_number int,
  title text,
  subtitle text,
  description text,
  prayer_text text,
  scripture_reference text,
  scripture_text text,
  duration_seconds int
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT day_number, title, subtitle, description, prayer_text,
         scripture_reference, scripture_text, duration_seconds
  FROM public.daily_audios
  WHERE day_number = _day
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_audio_preview(int) FROM public;
GRANT EXECUTE ON FUNCTION public.get_audio_preview(int) TO authenticated;