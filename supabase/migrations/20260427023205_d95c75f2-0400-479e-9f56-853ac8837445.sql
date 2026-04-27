-- 1) Pending vouchers table
CREATE TABLE IF NOT EXISTS public.premium_vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  months integer,                       -- null = lifetime
  reason text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  claimed_user_id uuid,
  revoked_at timestamptz,
  revoked_by uuid
);

CREATE UNIQUE INDEX IF NOT EXISTS premium_vouchers_email_unclaimed_uniq
  ON public.premium_vouchers (lower(email))
  WHERE claimed_at IS NULL AND revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS premium_vouchers_email_idx
  ON public.premium_vouchers (lower(email));

ALTER TABLE public.premium_vouchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read vouchers" ON public.premium_vouchers
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Deny client writes vouchers ins" ON public.premium_vouchers
  AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "Deny client writes vouchers upd" ON public.premium_vouchers
  AS RESTRICTIVE FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Deny client writes vouchers del" ON public.premium_vouchers
  AS RESTRICTIVE FOR DELETE TO anon, authenticated USING (false);

-- 2) Admin: create voucher
CREATE OR REPLACE FUNCTION public.admin_create_voucher(_email text, _months integer DEFAULT NULL, _reason text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id uuid; v_email text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;
  IF _email IS NULL OR length(trim(_email)) < 3 THEN
    RAISE EXCEPTION 'Invalid email';
  END IF;
  v_email := lower(trim(_email));

  -- Reuse existing pending voucher for this email
  SELECT id INTO v_id FROM public.premium_vouchers
   WHERE lower(email) = v_email AND claimed_at IS NULL AND revoked_at IS NULL
   LIMIT 1;
  IF v_id IS NOT NULL THEN
    UPDATE public.premium_vouchers
       SET months = _months, reason = _reason, created_by = auth.uid(), created_at = now()
     WHERE id = v_id;
  ELSE
    INSERT INTO public.premium_vouchers (email, months, reason, created_by)
    VALUES (v_email, _months, _reason, auth.uid())
    RETURNING id INTO v_id;
  END IF;

  PERFORM public.log_admin_action('create_voucher', 'voucher', v_id::text,
    jsonb_build_object('email', v_email, 'months', _months, 'reason', _reason));
  RETURN v_id;
END;
$$;

-- 3) Admin: revoke voucher
CREATE OR REPLACE FUNCTION public.admin_revoke_voucher(_voucher_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;
  UPDATE public.premium_vouchers
    SET revoked_at = now(), revoked_by = auth.uid()
    WHERE id = _voucher_id AND claimed_at IS NULL AND revoked_at IS NULL;
  PERFORM public.log_admin_action('revoke_voucher', 'voucher', _voucher_id::text, '{}'::jsonb);
END;
$$;

-- 4) Admin: list vouchers
CREATE OR REPLACE FUNCTION public.admin_list_vouchers(_status text DEFAULT 'pending', _search text DEFAULT NULL, _limit integer DEFAULT 50, _offset integer DEFAULT 0)
RETURNS TABLE(id uuid, email text, months integer, reason text, created_at timestamptz, claimed_at timestamptz, claimed_user_id uuid, revoked_at timestamptz, total_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;
  RETURN QUERY
  WITH base AS (
    SELECT v.* FROM public.premium_vouchers v
    WHERE (_status = 'pending'  AND v.claimed_at IS NULL AND v.revoked_at IS NULL)
       OR (_status = 'claimed'  AND v.claimed_at IS NOT NULL)
       OR (_status = 'revoked'  AND v.revoked_at IS NOT NULL)
       OR (_status = 'all')
  ),
  filtered AS (
    SELECT * FROM base b
    WHERE _search IS NULL OR _search = '' OR b.email ILIKE '%'||_search||'%'
  ),
  total AS (SELECT count(*)::bigint AS c FROM filtered)
  SELECT f.id, f.email, f.months, f.reason, f.created_at, f.claimed_at, f.claimed_user_id, f.revoked_at,
         (SELECT c FROM total)
  FROM filtered f ORDER BY f.created_at DESC
  LIMIT _limit OFFSET _offset;
END;
$$;

-- 5) Update handle_new_user to auto-claim voucher when signing up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_tz text;
  local_today date;
  v_voucher record;
  v_end timestamptz;
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

  -- Claim pending voucher if any
  SELECT * INTO v_voucher
    FROM public.premium_vouchers
   WHERE lower(email) = lower(NEW.email)
     AND claimed_at IS NULL AND revoked_at IS NULL
   ORDER BY created_at DESC LIMIT 1;

  IF v_voucher.id IS NOT NULL THEN
    v_end := CASE
      WHEN v_voucher.months IS NULL THEN '2099-12-31'::timestamptz
      ELSE now() + (v_voucher.months || ' months')::interval
    END;

    INSERT INTO public.subscribers (user_id, email, provider, plan, status, current_period_end, cancel_at_period_end)
    VALUES (NEW.id, NEW.email, 'manual', 'annual', 'active', v_end, false)
    ON CONFLICT (user_id) DO UPDATE
      SET provider='manual', plan='annual', status='active',
          current_period_end = v_end, cancel_at_period_end = false,
          updated_at = now();

    UPDATE public.premium_vouchers
      SET claimed_at = now(), claimed_user_id = NEW.id
      WHERE id = v_voucher.id;
  END IF;

  RETURN NEW;
END;
$$;