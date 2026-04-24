-- 1) Lock down user_roles: only admins may insert/update/delete; users keep read access to their own.
-- The existing "Admins manage roles" policy is FOR ALL but PERMISSIVE policies are OR-combined with
-- "Users see their roles", which is fine for SELECT. The risk is that no explicit deny exists for
-- non-admin INSERT/UPDATE/DELETE — and Supabase's default is "no policy = no access", so in fact
-- inserts ARE already blocked unless a permissive policy allows them. We re-assert this explicitly
-- with restrictive policies to make the guarantee unambiguous and audit-friendly.

DROP POLICY IF EXISTS "Restrict role writes to admins" ON public.user_roles;
CREATE POLICY "Restrict role writes to admins"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Restrict role updates to admins" ON public.user_roles;
CREATE POLICY "Restrict role updates to admins"
ON public.user_roles
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Restrict role deletes to admins" ON public.user_roles;
CREATE POLICY "Restrict role deletes to admins"
ON public.user_roles
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 2) Prevent users from editing their own start_date (which would unlock future content).
-- Keep all other profile fields editable by the owner via a BEFORE UPDATE trigger that
-- reverts forbidden changes unless the caller is an admin.

CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- Lock fields that gate content access / streaks
  IF NEW.start_date IS DISTINCT FROM OLD.start_date THEN
    NEW.start_date := OLD.start_date;
  END IF;
  IF NEW.best_streak IS DISTINCT FROM OLD.best_streak THEN
    NEW.best_streak := OLD.best_streak;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_sensitive_fields_trg ON public.profiles;
CREATE TRIGGER protect_profile_sensitive_fields_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_sensitive_fields();