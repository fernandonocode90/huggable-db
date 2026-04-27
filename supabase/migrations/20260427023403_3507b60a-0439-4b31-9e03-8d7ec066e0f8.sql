CREATE OR REPLACE FUNCTION public.admin_lookup_user_by_email(_email text)
RETURNS TABLE(id uuid, email text, display_name text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;
  RETURN QUERY
  SELECT u.id, u.email::text, p.display_name
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE lower(u.email) = lower(_email)
  LIMIT 1;
END;
$$;