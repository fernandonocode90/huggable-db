
-- =========================================
-- 1) Roles
-- =========================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

DROP POLICY IF EXISTS "Users see their roles" ON public.user_roles;
CREATE POLICY "Users see their roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins see all roles" ON public.user_roles;
CREATE POLICY "Admins see all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================
-- 2) Helpers updated_at
-- =========================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- =========================================
-- 3) Profiles
-- =========================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  reminder_time TIME NULL,
  reminder_enabled BOOLEAN NOT NULL DEFAULT false,
  best_streak INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles readable by owner" ON public.profiles;
CREATE POLICY "Profiles readable by owner" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "Profiles updatable by owner" ON public.profiles;
CREATE POLICY "Profiles updatable by owner" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "Profiles insertable by owner" ON public.profiles;
CREATE POLICY "Profiles insertable by owner" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =========================================
-- 4) handle_new_user
-- =========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_tz text;
  local_today date;
BEGIN
  user_tz := COALESCE(NEW.raw_user_meta_data->>'timezone', 'UTC');
  BEGIN
    local_today := (timezone(user_tz, now()))::date;
  EXCEPTION WHEN OTHERS THEN
    user_tz := 'UTC';
    local_today := (timezone('UTC', now()))::date;
  END;

  INSERT INTO public.profiles (id, display_name, avatar_url, start_date, timezone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    local_today,
    user_tz
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================
-- 5) Daily audios
-- =========================================
CREATE TABLE IF NOT EXISTS public.daily_audios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  day_number INTEGER UNIQUE,
  release_date DATE,
  r2_key TEXT NOT NULL,
  duration_seconds INTEGER,
  scripture_reference TEXT,
  scripture_text TEXT,
  prayer_text TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_audios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see audios up to their current day" ON public.daily_audios;
CREATE POLICY "Users see audios up to their current day"
ON public.daily_audios FOR SELECT TO authenticated
USING (
  day_number IS NOT NULL
  AND day_number <= (
    SELECT ((timezone(COALESCE(p.timezone, 'UTC'), now()))::date - p.start_date)::int + 1
    FROM public.profiles p WHERE p.id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins read all audios" ON public.daily_audios;
CREATE POLICY "Admins read all audios" ON public.daily_audios
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins insert audios" ON public.daily_audios;
CREATE POLICY "Admins insert audios" ON public.daily_audios
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins update audios" ON public.daily_audios;
CREATE POLICY "Admins update audios" ON public.daily_audios
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins delete audios" ON public.daily_audios;
CREATE POLICY "Admins delete audios" ON public.daily_audios
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS set_daily_audios_updated_at ON public.daily_audios;
CREATE TRIGGER set_daily_audios_updated_at
  BEFORE UPDATE ON public.daily_audios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =========================================
-- 6) Audio progress
-- =========================================
CREATE TABLE IF NOT EXISTS public.audio_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  audio_id uuid NOT NULL REFERENCES public.daily_audios(id) ON DELETE CASCADE,
  day_number integer NOT NULL,
  progress_pct numeric(5,2) NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  last_position_seconds integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, audio_id)
);
CREATE INDEX IF NOT EXISTS idx_audio_progress_user_day ON public.audio_progress (user_id, day_number);

ALTER TABLE public.audio_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own progress" ON public.audio_progress;
CREATE POLICY "Users read own progress" ON public.audio_progress
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own progress" ON public.audio_progress;
CREATE POLICY "Users insert own progress" ON public.audio_progress
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own progress" ON public.audio_progress;
CREATE POLICY "Users update own progress" ON public.audio_progress
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins read all progress" ON public.audio_progress;
CREATE POLICY "Admins read all progress" ON public.audio_progress
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS audio_progress_updated_at ON public.audio_progress;
CREATE TRIGGER audio_progress_updated_at
  BEFORE UPDATE ON public.audio_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =========================================
-- 7) Helper functions
-- =========================================
CREATE OR REPLACE FUNCTION public.get_current_day(_user_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT GREATEST(1, ((timezone(COALESCE(p.timezone, 'UTC'), now()))::date - p.start_date)::int + 1)
  FROM public.profiles p WHERE p.id = _user_id;
$$;

CREATE OR REPLACE FUNCTION public.get_user_streak(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  current_day_num int; streak int := 0; d int; done boolean;
BEGIN
  SELECT public.get_current_day(_user_id) INTO current_day_num;
  IF current_day_num IS NULL THEN RETURN 0; END IF;
  SELECT EXISTS (SELECT 1 FROM public.audio_progress
    WHERE user_id = _user_id AND day_number = current_day_num AND completed = true) INTO done;
  d := current_day_num;
  IF NOT done THEN d := current_day_num - 1; END IF;
  WHILE d >= 1 LOOP
    SELECT EXISTS (SELECT 1 FROM public.audio_progress
      WHERE user_id = _user_id AND day_number = d AND completed = true) INTO done;
    IF done THEN streak := streak + 1; d := d - 1;
    ELSE EXIT; END IF;
  END LOOP;
  RETURN streak;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_week_preview(_from_day int, _to_day int)
RETURNS TABLE (day_number int, title text, subtitle text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT day_number, title, subtitle
  FROM public.daily_audios
  WHERE day_number BETWEEN _from_day AND _to_day
  ORDER BY day_number ASC;
$$;
REVOKE ALL ON FUNCTION public.get_week_preview(int, int) FROM public;
GRANT EXECUTE ON FUNCTION public.get_week_preview(int, int) TO authenticated;

-- =========================================
-- 8) Avatars storage
-- =========================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can read their own avatar files" ON storage.objects;
CREATE POLICY "Users can read their own avatar files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =========================================
-- 9) Bible bookmarks & history
-- =========================================
CREATE TABLE IF NOT EXISTS public.bible_bookmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  translation TEXT NOT NULL,
  book_key TEXT NOT NULL,
  book_name TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  verse_text TEXT,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  highlight_color TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, translation, book_key, chapter, verse)
);
CREATE INDEX IF NOT EXISTS idx_bible_bookmarks_user ON public.bible_bookmarks (user_id);
CREATE INDEX IF NOT EXISTS idx_bible_bookmarks_lookup ON public.bible_bookmarks (user_id, translation, book_key, chapter);

ALTER TABLE public.bible_bookmarks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own bookmarks" ON public.bible_bookmarks;
CREATE POLICY "Users read own bookmarks" ON public.bible_bookmarks
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own bookmarks" ON public.bible_bookmarks;
CREATE POLICY "Users insert own bookmarks" ON public.bible_bookmarks
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own bookmarks" ON public.bible_bookmarks;
CREATE POLICY "Users update own bookmarks" ON public.bible_bookmarks
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own bookmarks" ON public.bible_bookmarks;
CREATE POLICY "Users delete own bookmarks" ON public.bible_bookmarks
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_bible_bookmarks_updated_at ON public.bible_bookmarks;
CREATE TRIGGER trg_bible_bookmarks_updated_at
  BEFORE UPDATE ON public.bible_bookmarks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE IF NOT EXISTS public.bible_reading_history (
  user_id UUID NOT NULL PRIMARY KEY,
  translation TEXT NOT NULL,
  book_key TEXT NOT NULL,
  book_name TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL DEFAULT 1,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bible_reading_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own reading history" ON public.bible_reading_history;
CREATE POLICY "Users read own reading history" ON public.bible_reading_history
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own reading history" ON public.bible_reading_history;
CREATE POLICY "Users insert own reading history" ON public.bible_reading_history
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own reading history" ON public.bible_reading_history;
CREATE POLICY "Users update own reading history" ON public.bible_reading_history
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own reading history" ON public.bible_reading_history;
CREATE POLICY "Users delete own reading history" ON public.bible_reading_history
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =========================================
-- 10) Daily devotionals
-- =========================================
CREATE TABLE IF NOT EXISTS public.daily_devotionals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  day_number INTEGER NOT NULL UNIQUE CHECK (day_number >= 1 AND day_number <= 365),
  verse_reference TEXT,
  verse_text TEXT,
  reflection_text TEXT,
  book_key TEXT,
  chapter INTEGER,
  verse_start INTEGER,
  verse_end INTEGER,
  translation TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_daily_devotionals_day_number ON public.daily_devotionals(day_number);

ALTER TABLE public.daily_devotionals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read all devotionals" ON public.daily_devotionals;
CREATE POLICY "Admins read all devotionals" ON public.daily_devotionals
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins insert devotionals" ON public.daily_devotionals;
CREATE POLICY "Admins insert devotionals" ON public.daily_devotionals
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins update devotionals" ON public.daily_devotionals;
CREATE POLICY "Admins update devotionals" ON public.daily_devotionals
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins delete devotionals" ON public.daily_devotionals;
CREATE POLICY "Admins delete devotionals" ON public.daily_devotionals
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users see devotionals up to their current day" ON public.daily_devotionals;
CREATE POLICY "Users see devotionals up to their current day"
ON public.daily_devotionals FOR SELECT TO authenticated
USING (
  day_number IS NOT NULL
  AND day_number <= (
    SELECT ((timezone(COALESCE(p.timezone, 'UTC'), now()))::date - p.start_date)::int + 1
    FROM public.profiles p WHERE p.id = auth.uid()
  )
);

DROP TRIGGER IF EXISTS update_daily_devotionals_updated_at ON public.daily_devotionals;
CREATE TRIGGER update_daily_devotionals_updated_at
BEFORE UPDATE ON public.daily_devotionals
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================
-- 11) Bible verses (full Bible)
-- =========================================
CREATE TABLE IF NOT EXISTS public.bible_verses (
  id BIGSERIAL PRIMARY KEY,
  translation TEXT NOT NULL,
  book_key TEXT NOT NULL,
  book_order INTEGER NOT NULL,
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  text TEXT NOT NULL,
  CONSTRAINT bible_verses_unique UNIQUE (translation, book_key, chapter, verse)
);
CREATE INDEX IF NOT EXISTS idx_bible_verses_lookup
  ON public.bible_verses (translation, book_key, chapter, verse);
CREATE INDEX IF NOT EXISTS idx_bible_verses_book_order
  ON public.bible_verses (translation, book_order, chapter, verse);

ALTER TABLE public.bible_verses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can read bible verses" ON public.bible_verses;
CREATE POLICY "Anyone authenticated can read bible verses" ON public.bible_verses
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins insert bible verses" ON public.bible_verses;
CREATE POLICY "Admins insert bible verses" ON public.bible_verses
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins update bible verses" ON public.bible_verses;
CREATE POLICY "Admins update bible verses" ON public.bible_verses
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins delete bible verses" ON public.bible_verses;
CREATE POLICY "Admins delete bible verses" ON public.bible_verses
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =========================================
-- 12) Push, reminders, calculator
-- =========================================
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint)
);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own push subs" ON public.push_subscriptions;
CREATE POLICY "Users read own push subs" ON public.push_subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own push subs" ON public.push_subscriptions;
CREATE POLICY "Users insert own push subs" ON public.push_subscriptions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own push subs" ON public.push_subscriptions;
CREATE POLICY "Users update own push subs" ON public.push_subscriptions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own push subs" ON public.push_subscriptions;
CREATE POLICY "Users delete own push subs" ON public.push_subscriptions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS push_subscriptions_set_updated_at ON public.push_subscriptions;
CREATE TRIGGER push_subscriptions_set_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions(user_id);

CREATE TABLE IF NOT EXISTS public.reminder_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  local_date date NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, local_date)
);
ALTER TABLE public.reminder_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own reminder log" ON public.reminder_log;
CREATE POLICY "Users read own reminder log" ON public.reminder_log
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.calculator_simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  initial_amount numeric NOT NULL DEFAULT 0,
  monthly_contribution numeric NOT NULL DEFAULT 0,
  annual_rate numeric NOT NULL DEFAULT 0,
  years integer NOT NULL DEFAULT 1,
  total_final numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.calculator_simulations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own simulations" ON public.calculator_simulations;
CREATE POLICY "Users read own simulations" ON public.calculator_simulations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own simulations" ON public.calculator_simulations;
CREATE POLICY "Users insert own simulations" ON public.calculator_simulations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own simulations" ON public.calculator_simulations;
CREATE POLICY "Users update own simulations" ON public.calculator_simulations
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own simulations" ON public.calculator_simulations;
CREATE POLICY "Users delete own simulations" ON public.calculator_simulations
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS calculator_simulations_set_updated_at ON public.calculator_simulations;
CREATE TRIGGER calculator_simulations_set_updated_at
  BEFORE UPDATE ON public.calculator_simulations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS idx_calculator_simulations_user ON public.calculator_simulations(user_id);

-- =========================================
-- 13) Extensions for scheduled push
-- =========================================
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- =========================================
-- 14) Backfill profiles/roles for existing users
-- =========================================
INSERT INTO public.profiles (id, display_name, start_date, timezone)
SELECT u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
  CURRENT_DATE, 'UTC'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'user'::public.app_role
FROM auth.users u
LEFT JOIN public.user_roles r ON r.user_id = u.id
WHERE r.user_id IS NULL;
