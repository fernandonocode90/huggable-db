CREATE OR REPLACE FUNCTION public.set_audio_duration_if_missing(_audio_id uuid, _duration integer)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.daily_audios
  SET duration_seconds = _duration
  WHERE id = _audio_id
    AND duration_seconds IS NULL
    AND _duration IS NOT NULL
    AND _duration > 0;
$$;

REVOKE ALL ON FUNCTION public.set_audio_duration_if_missing(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_audio_duration_if_missing(uuid, integer) TO authenticated;