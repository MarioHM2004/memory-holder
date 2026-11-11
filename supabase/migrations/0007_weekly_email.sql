-- Memory Holder — the Sunday email with a memory in it
--
-- Run once in the SQL Editor after 0006_search.sql.
--
-- A diary only works if you come back to it, and nothing here ever asked
-- anyone to. This is the roulette, arriving on its own.

alter table public.profiles
  -- On by default: it's about your own diary, not marketing, and a setting
  -- nobody finds is a feature nobody has. Every email carries the way out.
  add column weekly_email boolean not null default true,
  -- Lets someone unsubscribe from a mail client, where they have no session.
  -- Unguessable, and good for nothing else: the worst a leaked one does is
  -- stop an email.
  add column unsubscribe_token uuid not null default gen_random_uuid(),
  -- The interface language is a cookie, which a cron job can never see. Kept
  -- here so the email arrives in the language its reader chose.
  add column locale text not null default 'en';

-- The existing "profiles are editable by the user themselves" policy already
-- covers the new columns; no new policy needed.

-- Everyone due an email this week, with one of their memories picked at
-- random — the whole send decided in one query rather than a loop of them.
--
-- security definer because it reads auth.users for the address and crosses
-- every diary, which no caller is allowed to do on its own. It takes no
-- arguments and returns nothing caller-specific, and execute is granted only
-- to service_role, so a signed-in client can't reach it.
create function public.weekly_digest()
returns table (
  user_id uuid,
  email text,
  locale text,
  display_name text,
  unsubscribe_token uuid,
  memory_id uuid,
  diary_name text,
  title text,
  description text,
  memory_date date,
  cover_path text
)
language sql
security definer set search_path = public
stable
as $$
  select
    p.id,
    u.email::text,
    p.locale,
    p.display_name,
    p.unsubscribe_token,
    m.id,
    m.diary_name,
    m.title,
    m.description,
    m.memory_date,
    cover.path
  from public.profiles p
  join auth.users u on u.id = p.id
  -- A lateral join rather than a subquery per column: it draws one memory and
  -- every field comes from that same one. It also drops anyone whose diaries
  -- are still empty, who would otherwise get an email about nothing.
  cross join lateral (
    select mm.id, mm.title, mm.description, mm.memory_date, c.name as diary_name
    from public.memories mm
    join public.couples c on c.id = mm.couple_id
    where mm.couple_id in (
      select cm.couple_id from public.couple_members cm where cm.user_id = p.id
    )
    order by random()
    limit 1
  ) m
  -- Its photo, if it has one. left join: a memory that is only words is still
  -- worth sending.
  left join lateral (
    select coalesce(md.preview_path, md.storage_path) as path
    from public.media md
    where md.memory_id = m.id and md.media_type = 'image'
    order by md.position
    limit 1
  ) cover on true
  where p.weekly_email
    and u.email is not null
    and u.email_confirmed_at is not null;
$$;

revoke execute on function public.weekly_digest() from public, anon, authenticated;
grant execute on function public.weekly_digest() to service_role;

-- Turning it off from an email, where there is no session to act on. Returns
-- false for a token nobody has, so the page can say so rather than claiming
-- to have unsubscribed someone who doesn't exist.
create function public.unsubscribe_weekly(p_token uuid)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  v_found boolean;
begin
  update public.profiles
  set weekly_email = false
  where unsubscribe_token = p_token
  returning true into v_found;

  return coalesce(v_found, false);
end;
$$;

grant execute on function public.unsubscribe_weekly(uuid) to anon, authenticated;
