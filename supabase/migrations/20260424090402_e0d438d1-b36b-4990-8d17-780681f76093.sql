
-- =====================================================
-- 1. APP SETTINGS (maintenance mode + global banner)
-- =====================================================
CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read app settings"
  ON public.app_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert app settings"
  ON public.app_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update app settings"
  ON public.app_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete app settings"
  ON public.app_settings FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Seed defaults
INSERT INTO public.app_settings (key, value) VALUES
  ('maintenance', '{"enabled": false, "message": "Estamos em manutenção. Voltamos em breve."}'::jsonb),
  ('global_banner', '{"enabled": false, "message": "", "variant": "info"}'::jsonb);

-- Public read function (any authenticated user can fetch flags)
CREATE OR REPLACE FUNCTION public.get_public_app_settings()
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT jsonb_object_agg(key, value)
  FROM public.app_settings
  WHERE key IN ('maintenance', 'global_banner');
$$;

CREATE OR REPLACE FUNCTION public.admin_set_app_setting(_key TEXT, _value JSONB)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;
  INSERT INTO public.app_settings (key, value, updated_by, updated_at)
  VALUES (_key, _value, auth.uid(), now())
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value, updated_by = auth.uid(), updated_at = now();
  PERFORM public.log_admin_action('set_app_setting', 'app_settings', _key, _value);
END;
$$;

-- =====================================================
-- 2. USER ADMIN NOTES
-- =====================================================
CREATE TABLE public.user_admin_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  admin_id UUID NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_admin_notes_user ON public.user_admin_notes(user_id, created_at DESC);
ALTER TABLE public.user_admin_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage notes"
  ON public.user_admin_notes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- 3. USER BANS
-- =====================================================
CREATE TABLE public.user_bans (
  user_id UUID PRIMARY KEY,
  banned_by UUID NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_bans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage bans"
  ON public.user_bans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can check own ban status"
  ON public.user_bans FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- 4. ADMIN: USER DETAIL
-- =====================================================
CREATE OR REPLACE FUNCTION public.admin_get_user_detail(_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE result JSONB;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  SELECT jsonb_build_object(
    'profile', (
      SELECT jsonb_build_object(
        'id', p.id,
        'email', u.email,
        'display_name', p.display_name,
        'avatar_url', p.avatar_url,
        'timezone', p.timezone,
        'start_date', p.start_date,
        'best_streak', p.best_streak,
        'reminder_enabled', p.reminder_enabled,
        'reminder_time', p.reminder_time,
        'created_at', p.created_at,
        'last_sign_in_at', u.last_sign_in_at,
        'email_confirmed_at', u.email_confirmed_at,
        'current_day', public.get_current_day(p.id),
        'current_streak', public.get_user_streak(p.id),
        'is_admin', EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'admin'),
        'is_banned', EXISTS(SELECT 1 FROM public.user_bans b WHERE b.user_id = p.id),
        'ban_reason', (SELECT reason FROM public.user_bans WHERE user_id = p.id)
      )
      FROM public.profiles p
      LEFT JOIN auth.users u ON u.id = p.id
      WHERE p.id = _user_id
    ),
    'audio_progress', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'day_number', ap.day_number,
        'completed', ap.completed,
        'progress_pct', ap.progress_pct,
        'last_position_seconds', ap.last_position_seconds,
        'updated_at', ap.updated_at,
        'completed_at', ap.completed_at
      ) ORDER BY ap.day_number DESC)
      FROM public.audio_progress ap WHERE ap.user_id = _user_id
    ), '[]'::jsonb),
    'push_subscriptions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', ps.id,
        'user_agent', ps.user_agent,
        'created_at', ps.created_at,
        'updated_at', ps.updated_at
      ))
      FROM public.push_subscriptions ps WHERE ps.user_id = _user_id
    ), '[]'::jsonb),
    'bookmarks_count', (SELECT count(*) FROM public.bible_bookmarks WHERE user_id = _user_id),
    'simulations_count', (SELECT count(*) FROM public.calculator_simulations WHERE user_id = _user_id),
    'reading_history_count', (SELECT count(*) FROM public.bible_reading_history WHERE user_id = _user_id),
    'reminders_sent_count', (SELECT count(*) FROM public.reminder_log WHERE user_id = _user_id),
    'notes', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', n.id,
        'note', n.note,
        'admin_id', n.admin_id,
        'created_at', n.created_at
      ) ORDER BY n.created_at DESC)
      FROM public.user_admin_notes n WHERE n.user_id = _user_id
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

-- =====================================================
-- 5. ADMIN: GIFT STREAK
-- =====================================================
CREATE OR REPLACE FUNCTION public.admin_gift_streak(_user_id UUID, _new_best_streak INTEGER)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;
  IF _new_best_streak < 0 OR _new_best_streak > 10000 THEN
    RAISE EXCEPTION 'Invalid streak value';
  END IF;
  UPDATE public.profiles SET best_streak = _new_best_streak WHERE id = _user_id;
  PERFORM public.log_admin_action('gift_streak', 'user', _user_id::text,
    jsonb_build_object('new_best_streak', _new_best_streak));
END;
$$;

-- =====================================================
-- 6. ADMIN: SET USER DAY (shifts start_date)
-- =====================================================
CREATE OR REPLACE FUNCTION public.admin_set_user_day(_user_id UUID, _new_day INTEGER)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
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
  PERFORM public.log_admin_action('set_user_day', 'user', _user_id::text,
    jsonb_build_object('new_day', _new_day));
END;
$$;

-- =====================================================
-- 7. ADMIN: BAN / UNBAN
-- =====================================================
CREATE OR REPLACE FUNCTION public.admin_ban_user(_user_id UUID, _reason TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;
  IF _user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot ban yourself';
  END IF;
  INSERT INTO public.user_bans (user_id, banned_by, reason)
  VALUES (_user_id, auth.uid(), _reason)
  ON CONFLICT (user_id) DO UPDATE
    SET banned_by = auth.uid(), reason = EXCLUDED.reason, created_at = now();
  PERFORM public.log_admin_action('ban_user', 'user', _user_id::text,
    jsonb_build_object('reason', _reason));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_unban_user(_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;
  DELETE FROM public.user_bans WHERE user_id = _user_id;
  PERFORM public.log_admin_action('unban_user', 'user', _user_id::text, '{}'::jsonb);
END;
$$;

-- =====================================================
-- 8. ADMIN: ADD USER NOTE
-- =====================================================
CREATE OR REPLACE FUNCTION public.admin_add_user_note(_user_id UUID, _note TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE new_id UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;
  IF _note IS NULL OR length(trim(_note)) = 0 THEN
    RAISE EXCEPTION 'Note cannot be empty';
  END IF;
  INSERT INTO public.user_admin_notes (user_id, admin_id, note)
  VALUES (_user_id, auth.uid(), _note)
  RETURNING id INTO new_id;
  PERFORM public.log_admin_action('add_user_note', 'user', _user_id::text, '{}'::jsonb);
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_user_note(_note_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;
  DELETE FROM public.user_admin_notes WHERE id = _note_id;
  PERFORM public.log_admin_action('delete_user_note', 'note', _note_id::text, '{}'::jsonb);
END;
$$;

-- =====================================================
-- 9. ADMIN: WIPE USER DATA (does NOT delete auth.users)
-- =====================================================
CREATE OR REPLACE FUNCTION public.admin_wipe_user_data(_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;
  IF _user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot wipe your own data';
  END IF;
  DELETE FROM public.audio_progress WHERE user_id = _user_id;
  DELETE FROM public.bible_bookmarks WHERE user_id = _user_id;
  DELETE FROM public.bible_reading_history WHERE user_id = _user_id;
  DELETE FROM public.calculator_simulations WHERE user_id = _user_id;
  DELETE FROM public.push_subscriptions WHERE user_id = _user_id;
  DELETE FROM public.user_admin_notes WHERE user_id = _user_id;
  UPDATE public.profiles
    SET best_streak = 0, start_date = CURRENT_DATE, reminder_enabled = false
    WHERE id = _user_id;
  PERFORM public.log_admin_action('wipe_user_data', 'user', _user_id::text, '{}'::jsonb);
END;
$$;
