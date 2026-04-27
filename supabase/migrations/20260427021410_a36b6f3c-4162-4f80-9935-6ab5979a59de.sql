-- 1. Add provider column to subscribers
ALTER TABLE public.subscribers
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'stripe';

-- Ensure existing stripe rows are tagged correctly (they already default to stripe)
UPDATE public.subscribers SET provider = 'stripe'
  WHERE provider IS NULL OR (provider = 'stripe' AND stripe_customer_id IS NOT NULL);

-- Add a constraint via trigger (avoid CHECK so we can extend later)
CREATE OR REPLACE FUNCTION public.validate_subscriber_provider()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.provider NOT IN ('stripe','google','apple','manual') THEN
    RAISE EXCEPTION 'Invalid provider: %', NEW.provider;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_subscriber_provider_trg ON public.subscribers;
CREATE TRIGGER validate_subscriber_provider_trg
  BEFORE INSERT OR UPDATE ON public.subscribers
  FOR EACH ROW EXECUTE FUNCTION public.validate_subscriber_provider();

-- 2. Premium stats
CREATE OR REPLACE FUNCTION public.admin_premium_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  v_monthly_price numeric := 4.99;
  v_annual_price  numeric := 49.99;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  WITH active AS (
    SELECT s.*
    FROM public.subscribers s
    WHERE s.status IN ('active','trialing')
      AND (s.current_period_end IS NULL OR s.current_period_end > now())
  ),
  by_provider AS (
    SELECT provider, count(*) AS c FROM active GROUP BY provider
  ),
  by_plan AS (
    SELECT plan, count(*) AS c
    FROM active
    WHERE provider = 'stripe' AND status = 'active'
    GROUP BY plan
  ),
  trialing AS (
    SELECT count(*) AS c FROM active WHERE status = 'trialing'
  ),
  canceling AS (
    SELECT count(*) AS c FROM active WHERE cancel_at_period_end = true
  )
  SELECT jsonb_build_object(
    'total_premium', (SELECT count(*) FROM active),
    'by_provider', jsonb_build_object(
      'stripe', COALESCE((SELECT c FROM by_provider WHERE provider='stripe'),0),
      'google', COALESCE((SELECT c FROM by_provider WHERE provider='google'),0),
      'apple',  COALESCE((SELECT c FROM by_provider WHERE provider='apple'),0),
      'manual', COALESCE((SELECT c FROM by_provider WHERE provider='manual'),0)
    ),
    'trialing', (SELECT c FROM trialing),
    'canceling', (SELECT c FROM canceling),
    'stripe_monthly_count', COALESCE((SELECT c FROM by_plan WHERE plan='monthly'),0),
    'stripe_annual_count',  COALESCE((SELECT c FROM by_plan WHERE plan='annual'),0),
    -- MRR (annual amortized over 12 months)
    'estimated_mrr_brl',
      COALESCE((SELECT c FROM by_plan WHERE plan='monthly'),0) * v_monthly_price
      + COALESCE((SELECT c FROM by_plan WHERE plan='annual'),0)  * (v_annual_price / 12.0),
    'estimated_arr_brl',
      COALESCE((SELECT c FROM by_plan WHERE plan='monthly'),0) * v_monthly_price * 12
      + COALESCE((SELECT c FROM by_plan WHERE plan='annual'),0)  * v_annual_price,
    'prices', jsonb_build_object('monthly', v_monthly_price, 'annual', v_annual_price)
  ) INTO result;

  RETURN result;
END;
$$;

-- 3. List premium users with search
CREATE OR REPLACE FUNCTION public.admin_list_premium_users(
  _search text DEFAULT NULL,
  _provider text DEFAULT NULL,
  _limit int DEFAULT 50,
  _offset int DEFAULT 0
)
RETURNS TABLE(
  user_id uuid,
  email text,
  display_name text,
  provider text,
  plan text,
  status text,
  trial_end timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz,
  total_count bigint
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
  WITH base AS (
    SELECT
      s.user_id, au.email::text AS email, p.display_name,
      s.provider, s.plan, s.status, s.trial_end, s.current_period_end,
      s.cancel_at_period_end, s.stripe_customer_id, s.stripe_subscription_id,
      s.created_at
    FROM public.subscribers s
    LEFT JOIN auth.users au ON au.id = s.user_id
    LEFT JOIN public.profiles p ON p.id = s.user_id
    WHERE s.status IN ('active','trialing')
      AND (s.current_period_end IS NULL OR s.current_period_end > now())
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
  ORDER BY f.created_at DESC
  LIMIT _limit OFFSET _offset;
END;
$$;

-- 4. Premium user detail
CREATE OR REPLACE FUNCTION public.admin_get_premium_user_detail(_user_id uuid)
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
    'user', (SELECT jsonb_build_object(
              'id', p.id, 'email', au.email, 'display_name', p.display_name,
              'created_at', p.created_at, 'last_sign_in_at', au.last_sign_in_at,
              'timezone', p.timezone)
            FROM public.profiles p LEFT JOIN auth.users au ON au.id = p.id
            WHERE p.id = _user_id),
    'subscription', (SELECT to_jsonb(s) FROM public.subscribers s WHERE s.user_id = _user_id)
  ) INTO result;
  RETURN result;
END;
$$;

-- 5. Grant manual premium (courtesy)
CREATE OR REPLACE FUNCTION public.admin_grant_premium(
  _user_id uuid,
  _months int DEFAULT NULL,  -- null = lifetime (year 2099)
  _reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_email text;
  v_end timestamptz;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  SELECT email::text INTO v_email FROM auth.users WHERE id = _user_id;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  v_end := CASE
    WHEN _months IS NULL THEN '2099-12-31'::timestamptz
    ELSE now() + (_months || ' months')::interval
  END;

  INSERT INTO public.subscribers (user_id, email, provider, plan, status, current_period_end, cancel_at_period_end)
  VALUES (_user_id, v_email, 'manual', 'annual', 'active', v_end, false)
  ON CONFLICT (user_id) DO UPDATE
    SET provider='manual', plan='annual', status='active',
        current_period_end = v_end, cancel_at_period_end = false,
        updated_at = now();

  PERFORM public.log_admin_action('grant_premium', 'user', _user_id::text,
    jsonb_build_object('months', _months, 'reason', _reason, 'until', v_end));
END;
$$;

-- 6. Revoke manual premium
CREATE OR REPLACE FUNCTION public.admin_revoke_manual_premium(_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  UPDATE public.subscribers
    SET status = 'canceled', current_period_end = now(), updated_at = now()
    WHERE user_id = _user_id AND provider = 'manual';

  PERFORM public.log_admin_action('revoke_manual_premium', 'user', _user_id::text, '{}'::jsonb);
END;
$$;

-- 7. Mark a stripe subscription as canceled in DB (used by cancel-now edge function)
CREATE OR REPLACE FUNCTION public.admin_mark_subscription_canceled(_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  UPDATE public.subscribers
    SET status='canceled', cancel_at_period_end=false,
        current_period_end = LEAST(current_period_end, now()),
        updated_at = now()
    WHERE user_id = _user_id;

  PERFORM public.log_admin_action('cancel_subscription_immediate', 'user', _user_id::text, '{}'::jsonb);
END;
$$;

-- Add unique constraint on user_id if missing (needed for ON CONFLICT)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscribers_user_id_key'
  ) THEN
    ALTER TABLE public.subscribers ADD CONSTRAINT subscribers_user_id_key UNIQUE (user_id);
  END IF;
END $$;