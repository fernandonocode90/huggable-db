-- 1. Subscribers table
CREATE TABLE public.subscribers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'monthly', 'annual')),
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive', 'trialing', 'active', 'past_due', 'canceled', 'incomplete')),
  trial_end TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscribers_user_id ON public.subscribers(user_id);
CREATE INDEX idx_subscribers_stripe_customer ON public.subscribers(stripe_customer_id);

ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscription
CREATE POLICY "Users read own subscription"
ON public.subscribers FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can read all
CREATE POLICY "Admins read all subscriptions"
ON public.subscribers FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Inserts/updates/deletes only via service role (edge functions/webhooks)
CREATE POLICY "Deny client inserts on subscribers"
ON public.subscribers AS RESTRICTIVE FOR INSERT
TO anon, authenticated
WITH CHECK (false);

CREATE POLICY "Deny client updates on subscribers"
ON public.subscribers AS RESTRICTIVE FOR UPDATE
TO anon, authenticated
USING (false) WITH CHECK (false);

CREATE POLICY "Deny client deletes on subscribers"
ON public.subscribers AS RESTRICTIVE FOR DELETE
TO anon, authenticated
USING (false);

CREATE TRIGGER set_subscribers_updated_at
BEFORE UPDATE ON public.subscribers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Grandfathering cutoff stored in app_settings
INSERT INTO public.app_settings (key, value)
VALUES ('premium_grandfather_cutoff', to_jsonb(now()))
ON CONFLICT (key) DO NOTHING;

-- 3. Helper: is the user premium right now? (active sub OR trialing OR grandfathered)
CREATE OR REPLACE FUNCTION public.is_premium(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Active or trialing subscription with valid period
    EXISTS (
      SELECT 1 FROM public.subscribers s
      WHERE s.user_id = _user_id
        AND s.status IN ('active', 'trialing')
        AND (s.current_period_end IS NULL OR s.current_period_end > now())
    )
    OR
    -- Grandfathered: profile created before the cutoff
    EXISTS (
      SELECT 1 FROM public.profiles p, public.app_settings a
      WHERE p.id = _user_id
        AND a.key = 'premium_grandfather_cutoff'
        AND p.created_at < (a.value #>> '{}')::timestamptz
    );
$$;

-- 4. Update daily_audios policy: gate by is_premium
DROP POLICY IF EXISTS "Users see audios up to their current day" ON public.daily_audios;

CREATE POLICY "Users see audios up to their current day"
ON public.daily_audios FOR SELECT
TO authenticated
USING (
  day_number IS NOT NULL
  AND day_number <= (
    SELECT ((timezone(COALESCE(p.timezone, 'UTC'), now()))::date - p.start_date) + 1
    FROM public.profiles p WHERE p.id = auth.uid()
  )
  AND public.is_premium(auth.uid())
);

-- 5. Update saved_calculations: only premium can insert new scenarios
DROP POLICY IF EXISTS "Users insert own saved calculations" ON public.saved_calculations;

CREATE POLICY "Premium users insert own saved calculations"
ON public.saved_calculations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND public.is_premium(auth.uid()));
