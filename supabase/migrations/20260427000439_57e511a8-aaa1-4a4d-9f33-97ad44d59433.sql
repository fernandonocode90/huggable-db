-- 1. Table
CREATE TABLE public.onboarding_responses (
  user_id uuid PRIMARY KEY,
  intent text,
  season_of_life text,
  experience text,
  practice text,
  commitment text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.onboarding_responses ENABLE ROW LEVEL SECURITY;

-- 2. RLS
CREATE POLICY "Users read own onboarding"
  ON public.onboarding_responses FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users insert own onboarding"
  ON public.onboarding_responses FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own onboarding"
  ON public.onboarding_responses FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins read all onboarding"
  ON public.onboarding_responses FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 3. updated_at trigger
CREATE TRIGGER onboarding_responses_set_updated_at
  BEFORE UPDATE ON public.onboarding_responses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Indexes for grouping
CREATE INDEX idx_onboarding_intent ON public.onboarding_responses(intent);
CREATE INDEX idx_onboarding_season ON public.onboarding_responses(season_of_life);
CREATE INDEX idx_onboarding_experience ON public.onboarding_responses(experience);
CREATE INDEX idx_onboarding_practice ON public.onboarding_responses(practice);
CREATE INDEX idx_onboarding_commitment ON public.onboarding_responses(commitment);
CREATE INDEX idx_onboarding_completed_at ON public.onboarding_responses(completed_at);

-- 5. Stats function
CREATE OR REPLACE FUNCTION public.admin_get_onboarding_stats(_days integer DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
  v_filter_start timestamptz;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  v_filter_start := CASE WHEN _days IS NULL THEN NULL
                         ELSE now() - (_days || ' days')::interval END;

  WITH base AS (
    SELECT * FROM public.onboarding_responses
    WHERE v_filter_start IS NULL OR created_at >= v_filter_start
  ),
  totals AS (
    SELECT
      (SELECT count(*) FROM public.profiles
        WHERE v_filter_start IS NULL OR created_at >= v_filter_start) AS total_users,
      (SELECT count(*) FROM base) AS total_started,
      (SELECT count(*) FROM base WHERE completed_at IS NOT NULL) AS total_completed
  ),
  dist AS (
    SELECT
      (SELECT jsonb_object_agg(coalesce(intent,'(unanswered)'), c)
         FROM (SELECT intent, count(*) c FROM base GROUP BY intent) x) AS intent,
      (SELECT jsonb_object_agg(coalesce(season_of_life,'(unanswered)'), c)
         FROM (SELECT season_of_life, count(*) c FROM base GROUP BY season_of_life) x) AS season_of_life,
      (SELECT jsonb_object_agg(coalesce(experience,'(unanswered)'), c)
         FROM (SELECT experience, count(*) c FROM base GROUP BY experience) x) AS experience,
      (SELECT jsonb_object_agg(coalesce(practice,'(unanswered)'), c)
         FROM (SELECT practice, count(*) c FROM base GROUP BY practice) x) AS practice,
      (SELECT jsonb_object_agg(coalesce(commitment,'(unanswered)'), c)
         FROM (SELECT commitment, count(*) c FROM base GROUP BY commitment) x) AS commitment
  ),
  cross_ie AS (
    SELECT jsonb_agg(jsonb_build_object(
      'intent', intent, 'season', season_of_life, 'count', c
    )) AS rows
    FROM (
      SELECT intent, season_of_life, count(*) c
      FROM base
      WHERE intent IS NOT NULL AND season_of_life IS NOT NULL
      GROUP BY intent, season_of_life
      ORDER BY c DESC
    ) x
  )
  SELECT jsonb_build_object(
    'total_users', t.total_users,
    'total_started', t.total_started,
    'total_completed', t.total_completed,
    'completion_rate', CASE WHEN t.total_started > 0
      THEN round((t.total_completed::numeric / t.total_started::numeric) * 100, 1)
      ELSE 0 END,
    'response_rate', CASE WHEN t.total_users > 0
      THEN round((t.total_started::numeric / t.total_users::numeric) * 100, 1)
      ELSE 0 END,
    'distributions', jsonb_build_object(
      'intent', coalesce(d.intent, '{}'::jsonb),
      'season_of_life', coalesce(d.season_of_life, '{}'::jsonb),
      'experience', coalesce(d.experience, '{}'::jsonb),
      'practice', coalesce(d.practice, '{}'::jsonb),
      'commitment', coalesce(d.commitment, '{}'::jsonb)
    ),
    'cross_intent_season', coalesce(cie.rows, '[]'::jsonb)
  ) INTO result
  FROM totals t, dist d, cross_ie cie;

  RETURN result;
END;
$$;

-- 6. List function for CSV export
CREATE OR REPLACE FUNCTION public.admin_list_onboarding_responses(
  _limit integer DEFAULT 1000,
  _offset integer DEFAULT 0
)
RETURNS TABLE(
  user_id uuid,
  email text,
  display_name text,
  intent text,
  season_of_life text,
  experience text,
  practice text,
  commitment text,
  completed_at timestamptz,
  created_at timestamptz,
  total_count bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  RETURN QUERY
  WITH total AS (SELECT count(*)::bigint AS c FROM public.onboarding_responses)
  SELECT
    o.user_id,
    au.email::text,
    p.display_name,
    o.intent, o.season_of_life, o.experience, o.practice, o.commitment,
    o.completed_at, o.created_at,
    (SELECT c FROM total)
  FROM public.onboarding_responses o
  LEFT JOIN public.profiles p ON p.id = o.user_id
  LEFT JOIN auth.users au ON au.id = o.user_id
  ORDER BY o.created_at DESC
  LIMIT _limit OFFSET _offset;
END;
$$;