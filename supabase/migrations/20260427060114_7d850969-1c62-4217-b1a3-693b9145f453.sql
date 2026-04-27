CREATE OR REPLACE FUNCTION public.admin_get_user_detail(_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
        'journey_completions', COALESCE(p.journey_completions, 0),
        'paywall_last_seen_at', p.paywall_last_seen_at,
        'is_admin', EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'admin'),
        'is_banned', EXISTS(SELECT 1 FROM public.user_bans b WHERE b.user_id = p.id),
        'ban_reason', (SELECT reason FROM public.user_bans WHERE user_id = p.id),
        'is_premium', public.is_premium(p.id)
      )
      FROM public.profiles p
      LEFT JOIN auth.users u ON u.id = p.id
      WHERE p.id = _user_id
    ),
    'subscription', (
      SELECT to_jsonb(s) FROM public.subscribers s WHERE s.user_id = _user_id
    ),
    'onboarding', (
      SELECT to_jsonb(o) FROM public.onboarding_responses o WHERE o.user_id = _user_id
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
$function$;