CREATE OR REPLACE FUNCTION public.admin_list_premium_users_by_status(
  _status text DEFAULT 'active',         -- 'active' | 'trialing' | 'canceled' | 'all'
  _search text DEFAULT NULL,
  _provider text DEFAULT NULL,
  _limit integer DEFAULT 50,
  _offset integer DEFAULT 0
)
RETURNS TABLE(
  user_id uuid, email text, display_name text,
  provider text, plan text, status text,
  trial_end timestamptz, current_period_end timestamptz,
  cancel_at_period_end boolean,
  stripe_customer_id text, stripe_subscription_id text,
  created_at timestamptz, updated_at timestamptz,
  total_count bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      s.user_id, au.email::text AS email, p.display_name,
      s.provider, s.plan, s.status, s.trial_end, s.current_period_end,
      s.cancel_at_period_end, s.stripe_customer_id, s.stripe_subscription_id,
      s.created_at, s.updated_at
    FROM public.subscribers s
    LEFT JOIN auth.users au ON au.id = s.user_id
    LEFT JOIN public.profiles p ON p.id = s.user_id
    WHERE
      CASE _status
        WHEN 'active' THEN
          s.status = 'active'
          AND (s.current_period_end IS NULL OR s.current_period_end > now())
        WHEN 'trialing' THEN
          s.status = 'trialing'
          AND (s.current_period_end IS NULL OR s.current_period_end > now())
        WHEN 'canceled' THEN
          s.status = 'canceled'
          OR (s.current_period_end IS NOT NULL AND s.current_period_end <= now())
        WHEN 'all' THEN TRUE
        ELSE FALSE
      END
  ),
  filtered AS (
    SELECT * FROM base b
    WHERE (_search IS NULL OR _search = ''
           OR b.email ILIKE '%'||_search||'%'
           OR b.display_name ILIKE '%'||_search||'%')
      AND (_provider IS NULL OR b.provider = _provider)
  ),
  total AS (SELECT count(*)::bigint AS c FROM filtered)
  SELECT f.*, (SELECT c FROM total)
  FROM filtered f
  ORDER BY
    CASE WHEN _status = 'canceled'
         THEN COALESCE(f.current_period_end, f.updated_at)
         ELSE f.created_at
    END DESC
  LIMIT _limit OFFSET _offset;
END;
$$;