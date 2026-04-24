-- 1. Reminder log: explicitly deny client writes (defense in depth).
--    Edge functions use service_role and bypass RLS, so this won't break them.
CREATE POLICY "Deny client inserts to reminder_log"
  ON public.reminder_log
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (false);

CREATE POLICY "Deny client updates to reminder_log"
  ON public.reminder_log
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Deny client deletes from reminder_log"
  ON public.reminder_log
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated, anon
  USING (false);

-- 2. Move pgcrypto out of public schema.
CREATE SCHEMA IF NOT EXISTS extensions;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'pgcrypto' AND n.nspname = 'public'
  ) THEN
    EXECUTE 'ALTER EXTENSION pgcrypto SET SCHEMA extensions';
  END IF;
END $$;

-- 3. Indexes for daily lookups.
CREATE INDEX IF NOT EXISTS idx_daily_audios_day_number
  ON public.daily_audios (day_number);

CREATE INDEX IF NOT EXISTS idx_daily_devotionals_day_number
  ON public.daily_devotionals (day_number);

CREATE INDEX IF NOT EXISTS idx_audio_progress_user_audio
  ON public.audio_progress (user_id, audio_id);

CREATE INDEX IF NOT EXISTS idx_audio_progress_user_day
  ON public.audio_progress (user_id, day_number);

CREATE INDEX IF NOT EXISTS idx_bible_verses_lookup
  ON public.bible_verses (translation, book_key, chapter, verse);

CREATE INDEX IF NOT EXISTS idx_bible_bookmarks_user
  ON public.bible_bookmarks (user_id);

CREATE INDEX IF NOT EXISTS idx_bible_reading_history_user
  ON public.bible_reading_history (user_id);