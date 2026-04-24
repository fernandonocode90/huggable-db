CREATE OR REPLACE FUNCTION public.admin_list_bookmark_notes(_search text DEFAULT NULL::text, _limit integer DEFAULT 50, _offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, user_id uuid, user_email text, display_name text, book_name text, chapter integer, verse integer, translation text, note text, verse_text text, created_at timestamp with time zone, total_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_is_admin boolean;
begin
  v_is_admin := public.has_role(auth.uid(), 'admin');
  if not v_is_admin then raise exception 'forbidden'; end if;

  return query
  with base as (
    select b.* from public.bible_bookmarks b
    where b.note is not null and length(trim(b.note)) > 0
  ),
  filtered as (
    select b.* from base b
    where _search is null
       or b.note ilike '%' || _search || '%'
       or b.book_name ilike '%' || _search || '%'
  ),
  total as (select count(*)::bigint as c from filtered)
  select
    f.id, f.user_id,
    (select au.email::text from auth.users au where au.id = f.user_id) as user_email,
    (select p.display_name from public.profiles p where p.id = f.user_id) as display_name,
    f.book_name, f.chapter, f.verse, f.translation, f.note, f.verse_text, f.created_at,
    (select c from total) as total_count
  from filtered f
  order by f.created_at desc
  limit _limit offset _offset;
end;
$function$;