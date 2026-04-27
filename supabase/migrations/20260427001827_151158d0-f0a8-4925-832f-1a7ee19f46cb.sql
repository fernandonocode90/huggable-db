-- Seed default app_version and force_clear_cache_at in app_settings (idempotent)
INSERT INTO public.app_settings (key, value, updated_at)
VALUES ('app_version', to_jsonb('1'::text), now())
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.app_settings (key, value, updated_at)
VALUES ('force_clear_cache_at', to_jsonb(now()), now())
ON CONFLICT (key) DO NOTHING;

-- Replace get_public_app_settings to also expose cache-control keys to all users
CREATE OR REPLACE FUNCTION public.get_public_app_settings()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT jsonb_object_agg(key, value)
  FROM public.app_settings
  WHERE key IN ('maintenance', 'global_banner', 'app_version', 'force_clear_cache_at');
$function$;

-- Admin action: bump app version (silent auto-update for all clients)
CREATE OR REPLACE FUNCTION public.admin_bump_app_version()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_new text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;
  v_new := extract(epoch from now())::bigint::text;
  INSERT INTO public.app_settings (key, value, updated_by, updated_at)
  VALUES ('app_version', to_jsonb(v_new), auth.uid(), now())
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value, updated_by = auth.uid(), updated_at = now();
  PERFORM public.log_admin_action('bump_app_version', 'app_settings', 'app_version',
    jsonb_build_object('new_version', v_new));
  RETURN v_new;
END;
$function$;

-- Admin action: force full cache clear for all clients
CREATE OR REPLACE FUNCTION public.admin_force_clear_cache()
 RETURNS timestamptz
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ts timestamptz := now();
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;
  INSERT INTO public.app_settings (key, value, updated_by, updated_at)
  VALUES ('force_clear_cache_at', to_jsonb(v_ts), auth.uid(), now())
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value, updated_by = auth.uid(), updated_at = now();
  PERFORM public.log_admin_action('force_clear_cache', 'app_settings', 'force_clear_cache_at',
    jsonb_build_object('at', v_ts));
  RETURN v_ts;
END;
$function$;