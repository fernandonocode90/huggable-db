
-- 1. CLIENT ERRORS TABLE
create table if not exists public.client_errors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  message text not null,
  stack text,
  route text,
  user_agent text,
  app_version text,
  created_at timestamptz not null default now()
);

create index if not exists idx_client_errors_created_at on public.client_errors (created_at desc);
create index if not exists idx_client_errors_user_id on public.client_errors (user_id);

alter table public.client_errors enable row level security;

-- Anyone logged in can insert their own error report
drop policy if exists "users insert own errors" on public.client_errors;
create policy "users insert own errors"
on public.client_errors
for insert
to authenticated
with check (user_id is null or user_id = auth.uid());

-- Only admins can read
drop policy if exists "admins read errors" on public.client_errors;
create policy "admins read errors"
on public.client_errors
for select
to authenticated
using (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete
drop policy if exists "admins delete errors" on public.client_errors;
create policy "admins delete errors"
on public.client_errors
for delete
to authenticated
using (public.has_role(auth.uid(), 'admin'));


-- 2. SEGMENTED USER LIST RPC
create or replace function public.admin_list_users_segmented(
  _segment text default null,
  _stuck_day int default null,
  _search text default null,
  _limit int default 25,
  _offset int default 0
)
returns table (
  id uuid,
  email text,
  display_name text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  best_streak int,
  current_streak int,
  current_day int,
  total_completions bigint,
  is_admin boolean,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_is_admin boolean;
begin
  v_is_admin := public.has_role(auth.uid(), 'admin');
  if not v_is_admin then
    raise exception 'forbidden';
  end if;

  return query
  with base as (
    select
      p.id,
      au.email::text as email,
      p.display_name,
      p.created_at,
      au.last_sign_in_at,
      p.best_streak,
      public.get_user_streak(p.id) as current_streak,
      public.get_current_day(p.id) as current_day,
      coalesce((select count(*) from public.audio_progress ap where ap.user_id = p.id and ap.completed), 0) as total_completions,
      public.has_role(p.id, 'admin'::app_role) as is_admin,
      (select max(updated_at) from public.audio_progress ap where ap.user_id = p.id) as last_activity
    from public.profiles p
    left join auth.users au on au.id = p.id
  ),
  filtered as (
    select * from base b
    where (_search is null
            or b.email ilike '%' || _search || '%'
            or b.display_name ilike '%' || _search || '%')
      and (
        _segment is null
        or (_segment = 'inactive_7d'   and (b.last_activity is null or b.last_activity < now() - interval '7 days'))
        or (_segment = 'inactive_30d'  and (b.last_activity is null or b.last_activity < now() - interval '30 days'))
        or (_segment = 'completed_30plus' and b.total_completions >= 30)
        or (_segment = 'stuck_at_day'  and _stuck_day is not null and b.current_day = _stuck_day
             and (b.last_activity is null or b.last_activity < now() - interval '3 days'))
        or (_segment = 'admins' and b.is_admin)
      )
  ),
  total as (select count(*)::bigint as c from filtered)
  select
    f.id, f.email, f.display_name, f.created_at, f.last_sign_in_at,
    f.best_streak, f.current_streak, f.current_day, f.total_completions, f.is_admin,
    (select c from total) as total_count
  from filtered f
  order by f.created_at desc
  limit _limit offset _offset;
end;
$$;


-- 3. SYSTEM HEALTH RPC
create or replace function public.admin_get_health()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_is_admin boolean;
  result json;
begin
  v_is_admin := public.has_role(auth.uid(), 'admin');
  if not v_is_admin then raise exception 'forbidden'; end if;

  select json_build_object(
    'audios_total', (select count(*) from public.daily_audios),
    'audios_missing_duration', (select count(*) from public.daily_audios where duration_seconds is null or duration_seconds = 0),
    'audios_missing_day_number', (select count(*) from public.daily_audios where day_number is null),
    'devotionals_total', (select count(*) from public.daily_devotionals),
    'push_subs_total', (select count(*) from public.push_subscriptions),
    'push_subs_stale_30d', (select count(*) from public.push_subscriptions where updated_at < now() - interval '30 days'),
    'client_errors_24h', (select count(*) from public.client_errors where created_at >= now() - interval '24 hours'),
    'client_errors_7d', (select count(*) from public.client_errors where created_at >= now() - interval '7 days'),
    'reminders_sent_24h', (select count(*) from public.reminder_log where sent_at >= now() - interval '24 hours'),
    'banned_users', (select count(*) from public.user_bans),
    'last_audio_added', (select max(created_at) from public.daily_audios),
    'last_devotional_added', (select max(created_at) from public.daily_devotionals),
    'last_admin_action', (select max(created_at) from public.admin_audit_log)
  ) into result;

  return result;
end;
$$;


-- 4. ADMIN LIST CLIENT ERRORS RPC
create or replace function public.admin_list_client_errors(
  _limit int default 50,
  _offset int default 0
)
returns table (
  id uuid,
  user_id uuid,
  user_email text,
  message text,
  stack text,
  route text,
  user_agent text,
  app_version text,
  created_at timestamptz,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_is_admin boolean;
begin
  v_is_admin := public.has_role(auth.uid(), 'admin');
  if not v_is_admin then raise exception 'forbidden'; end if;

  return query
  with total as (select count(*)::bigint as c from public.client_errors)
  select
    e.id, e.user_id,
    (select au.email::text from auth.users au where au.id = e.user_id) as user_email,
    e.message, e.stack, e.route, e.user_agent, e.app_version, e.created_at,
    (select c from total) as total_count
  from public.client_errors e
  order by e.created_at desc
  limit _limit offset _offset;
end;
$$;


-- 5. MODERATION: list bookmark notes globally
create or replace function public.admin_list_bookmark_notes(
  _search text default null,
  _limit int default 50,
  _offset int default 0
)
returns table (
  id uuid,
  user_id uuid,
  user_email text,
  display_name text,
  book_name text,
  chapter int,
  verse int,
  translation text,
  note text,
  verse_text text,
  created_at timestamptz,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
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
    select * from base
    where _search is null
       or note ilike '%' || _search || '%'
       or book_name ilike '%' || _search || '%'
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
$$;


-- 6. MODERATION: clear a bookmark note (keeps the bookmark itself)
create or replace function public.admin_clear_bookmark_note(_bookmark_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin boolean;
begin
  v_is_admin := public.has_role(auth.uid(), 'admin');
  if not v_is_admin then raise exception 'forbidden'; end if;

  update public.bible_bookmarks set note = null, updated_at = now() where id = _bookmark_id;

  perform public.log_admin_action(
    'clear_bookmark_note', _bookmark_id::text, 'bible_bookmark', null
  );
end;
$$;
