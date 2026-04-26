DROP POLICY IF EXISTS "Users see audios up to their current day" ON public.daily_audios;

CREATE POLICY "Users see audios up to their current day"
ON public.daily_audios
FOR SELECT
TO authenticated
USING (
  day_number IS NOT NULL
  AND day_number <= (
    SELECT (((timezone(COALESCE(p.timezone, 'UTC'::text), now()))::date - p.start_date) + 1)
    FROM profiles p
    WHERE p.id = auth.uid()
  )
);