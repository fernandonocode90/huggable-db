-- =====================================================================
-- ADMIN AUDIT LOG
-- =====================================================================
CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_audit_log_created_at ON public.admin_audit_log (created_at DESC);
CREATE INDEX idx_admin_audit_log_admin_id ON public.admin_audit_log (admin_id);
CREATE INDEX idx_admin_audit_log_action ON public.admin_audit_log (action);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read audit log"
  ON public.admin_audit_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Deny client inserts on audit log"
  ON public.admin_audit_log AS RESTRICTIVE FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY "Deny client updates on audit log"
  ON public.admin_audit_log AS RESTRICTIVE FOR UPDATE
  TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY "Deny client deletes on audit log"
  ON public.admin_audit_log AS RESTRICTIVE FOR DELETE
  TO anon, authenticated
  USING (false);

-- Internal logger
CREATE OR REPLACE FUNCTION public.log_admin_action(
  _action text,
  _entity_type text DEFAULT NULL,
  _entity_id text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;
  INSERT INTO public.admin_audit_log (admin_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), _action, _entity_type, _entity_id, COALESCE(_metadata, '{}'::jsonb));
END;
$$;

-- =====================================================================
-- OVERVIEW STATS
-- =====================================================================
CREATE OR REPLACE FUNCTION public.admin_get_overview_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  SELECT jsonb_build_object(
    'total_users', (SELECT count(*) FROM public.profiles),
    'new_users_7d', (SELECT count(*) FROM public.profiles WHERE created_at >= now() - interval '7 days'),
    'new_users_30d', (SELECT count(*) FROM public.profiles WHERE created_at >= now() - interval '30 days'),
    'active_users_today', (SELECT count(DISTINCT user_id) FROM public.audio_progress WHERE updated_at >= now() - interval '1 day'),
    'active_users_7d', (SELECT count(DISTINCT user_id) FROM public.audio_progress WHERE updated_at >= now() - interval '7 days'),
    'active_users_30d', (SELECT count(DISTINCT user_id) FROM public.audio_progress WHERE updated_at >= now() - interval '30 days'),
    'completions_today', (SELECT count(*) FROM public.audio_progress WHERE completed = true AND completed_at >= now() - interval '1 day'),
    'completions_7d', (SELECT count(*) FROM public.audio_progress WHERE completed = true AND completed_at >= now() - interval '7 days'),
    'total_completions', (SELECT count(*) FROM public.audio_progress WHERE completed = true),
    'total_audios', (SELECT count(*) FROM public.daily_audios),
    'total_devotionals', (SELECT count(*) FROM public.daily_devotionals),
    'total_simulations', (SELECT count(*) FROM public.calculator_simulations),
    'total_bookmarks', (SELECT count(*) FROM public.bible_bookmarks),
    'avg_best_streak', (SELECT COALESCE(round(avg(best_streak)::numeric, 1), 0) FROM public.profiles WHERE best_streak > 0),
    'max_best_streak', (SELECT COALESCE(max(best_streak), 0) FROM public.profiles),
    'admin_count', (SELECT count(*) FROM public.user_roles WHERE role = 'admin')
  ) INTO result;

  RETURN result;
END;
$$;

-- =====================================================================
-- SIGNUPS BY DAY
-- =====================================================================
CREATE OR REPLACE FUNCTION public.admin_get_signups_by_day(_days integer DEFAULT 30)
RETURNS TABLE(day date, count bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  RETURN QUERY
  WITH series AS (
    SELECT generate_series(
      (now() - (_days || ' days')::interval)::date,
      now()::date,
      interval '1 day'
    )::date AS day
  )
  SELECT s.day, COALESCE(count(p.id), 0)::bigint
  FROM series s
  LEFT JOIN public.profiles p ON p.created_at::date = s.day
  GROUP BY s.day
  ORDER BY s.day;
END;
$$;

-- =====================================================================
-- COMPLETIONS BY DAY
-- =====================================================================
CREATE OR REPLACE FUNCTION public.admin_get_completions_by_day(_days integer DEFAULT 30)
RETURNS TABLE(day date, count bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  RETURN QUERY
  WITH series AS (
    SELECT generate_series(
      (now() - (_days || ' days')::interval)::date,
      now()::date,
      interval '1 day'
    )::date AS day
  )
  SELECT s.day, COALESCE(count(ap.id), 0)::bigint
  FROM series s
  LEFT JOIN public.audio_progress ap
    ON ap.completed = true AND ap.completed_at::date = s.day
  GROUP BY s.day
  ORDER BY s.day;
END;
$$;

-- =====================================================================
-- AUDIO METRICS
-- =====================================================================
CREATE OR REPLACE FUNCTION public.admin_get_audio_metrics()
RETURNS TABLE(
  audio_id uuid,
  day_number integer,
  title text,
  total_plays bigint,
  completions bigint,
  avg_progress numeric,
  completion_rate numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  RETURN QUERY
  SELECT
    a.id,
    a.day_number,
    a.title,
    COALESCE(count(ap.id), 0)::bigint AS total_plays,
    COALESCE(count(ap.id) FILTER (WHERE ap.completed), 0)::bigint AS completions,
    COALESCE(round(avg(ap.progress_pct)::numeric, 1), 0) AS avg_progress,
    CASE
      WHEN count(ap.id) > 0
      THEN round((count(ap.id) FILTER (WHERE ap.completed)::numeric / count(ap.id)::numeric) * 100, 1)
      ELSE 0
    END AS completion_rate
  FROM public.daily_audios a
  LEFT JOIN public.audio_progress ap ON ap.audio_id = a.id
  GROUP BY a.id, a.day_number, a.title
  ORDER BY a.day_number NULLS LAST;
END;
$$;

-- =====================================================================
-- LIST USERS
-- =====================================================================
CREATE OR REPLACE FUNCTION public.admin_list_users(
  _search text DEFAULT NULL,
  _limit integer DEFAULT 50,
  _offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  email text,
  display_name text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  best_streak integer,
  current_streak integer,
  current_day integer,
  total_completions bigint,
  is_admin boolean,
  total_count bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total bigint;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  SELECT count(*) INTO v_total
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE _search IS NULL
     OR _search = ''
     OR p.display_name ILIKE '%' || _search || '%'
     OR u.email ILIKE '%' || _search || '%';

  RETURN QUERY
  SELECT
    p.id,
    u.email::text,
    p.display_name,
    p.created_at,
    u.last_sign_in_at,
    p.best_streak,
    public.get_user_streak(p.id) AS current_streak,
    public.get_current_day(p.id) AS current_day,
    COALESCE((SELECT count(*) FROM public.audio_progress ap WHERE ap.user_id = p.id AND ap.completed = true), 0)::bigint,
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'admin') AS is_admin,
    v_total
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE _search IS NULL
     OR _search = ''
     OR p.display_name ILIKE '%' || _search || '%'
     OR u.email ILIKE '%' || _search || '%'
  ORDER BY p.created_at DESC
  LIMIT _limit OFFSET _offset;
END;
$$;

-- =====================================================================
-- SET USER ROLE
-- =====================================================================
CREATE OR REPLACE FUNCTION public.admin_set_user_role(
  _user_id uuid,
  _make_admin boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;
  IF _user_id = auth.uid() AND NOT _make_admin THEN
    RAISE EXCEPTION 'You cannot remove your own admin role';
  END IF;

  IF _make_admin THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'admin';
  END IF;

  PERFORM public.log_admin_action(
    CASE WHEN _make_admin THEN 'promote_to_admin' ELSE 'demote_from_admin' END,
    'user',
    _user_id::text,
    jsonb_build_object('target_user_id', _user_id)
  );
END;
$$;

-- user_roles needs unique constraint for ON CONFLICT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_roles_user_id_role_key'
  ) THEN
    ALTER TABLE public.user_roles
      ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
  END IF;
END $$;

-- =====================================================================
-- RESET USER STREAK
-- =====================================================================
CREATE OR REPLACE FUNCTION public.admin_reset_user_streak(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  UPDATE public.profiles
  SET best_streak = 0,
      start_date = CURRENT_DATE
  WHERE id = _user_id;

  PERFORM public.log_admin_action('reset_user_streak', 'user', _user_id::text, '{}'::jsonb);
END;
$$;

-- =====================================================================
-- TRANSLATION COUNTS
-- =====================================================================
CREATE OR REPLACE FUNCTION public.admin_get_translation_counts()
RETURNS TABLE(translation text, verse_count bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  RETURN QUERY
  SELECT bv.translation, count(*)::bigint
  FROM public.bible_verses bv
  GROUP BY bv.translation
  ORDER BY bv.translation;
END;
$$;

-- =====================================================================
-- CALCULATOR STATS
-- =====================================================================
CREATE OR REPLACE FUNCTION public.admin_get_calculator_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  SELECT jsonb_build_object(
    'total_simulations', (SELECT count(*) FROM public.calculator_simulations),
    'unique_users', (SELECT count(DISTINCT user_id) FROM public.calculator_simulations),
    'avg_initial_amount', COALESCE((SELECT round(avg(initial_amount)::numeric, 2) FROM public.calculator_simulations), 0),
    'avg_monthly_contribution', COALESCE((SELECT round(avg(monthly_contribution)::numeric, 2) FROM public.calculator_simulations), 0),
    'avg_annual_rate', COALESCE((SELECT round(avg(annual_rate)::numeric, 2) FROM public.calculator_simulations), 0),
    'avg_years', COALESCE((SELECT round(avg(years)::numeric, 1) FROM public.calculator_simulations), 0),
    'avg_total_final', COALESCE((SELECT round(avg(total_final)::numeric, 2) FROM public.calculator_simulations), 0)
  ) INTO result;
  RETURN result;
END;
$$;

-- =====================================================================
-- REMINDER STATS
-- =====================================================================
CREATE OR REPLACE FUNCTION public.admin_get_reminder_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  SELECT jsonb_build_object(
    'reminders_enabled', (SELECT count(*) FROM public.profiles WHERE reminder_enabled = true),
    'reminders_disabled', (SELECT count(*) FROM public.profiles WHERE reminder_enabled = false),
    'push_subscriptions', (SELECT count(*) FROM public.push_subscriptions),
    'unique_subscribed_users', (SELECT count(DISTINCT user_id) FROM public.push_subscriptions),
    'reminders_sent_7d', (SELECT count(*) FROM public.reminder_log WHERE sent_at >= now() - interval '7 days'),
    'reminders_sent_30d', (SELECT count(*) FROM public.reminder_log WHERE sent_at >= now() - interval '30 days')
  ) INTO result;
  RETURN result;
END;
$$;