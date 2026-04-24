CREATE OR REPLACE FUNCTION public.admin_clear_bookmark_note(_bookmark_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_is_admin boolean;
  v_fav boolean;
  v_color text;
begin
  v_is_admin := public.has_role(auth.uid(), 'admin');
  if not v_is_admin then raise exception 'forbidden'; end if;

  select is_favorite, highlight_color
    into v_fav, v_color
  from public.bible_bookmarks
  where id = _bookmark_id;

  if not found then
    return;
  end if;

  if coalesce(v_fav, false) = false and (v_color is null or length(trim(v_color)) = 0) then
    -- Nada além da nota: remove o marcador inteiro para não ficar órfão na biblioteca.
    delete from public.bible_bookmarks where id = _bookmark_id;
  else
    update public.bible_bookmarks
      set note = null, updated_at = now()
      where id = _bookmark_id;
  end if;

  perform public.log_admin_action(
    'clear_bookmark_note', _bookmark_id::text, 'bible_bookmark', null
  );
end;
$function$;