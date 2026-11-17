-- Memory Holder — a diary anyone can look around, and nobody can change
--
-- Run once in the SQL Editor after 0007_weekly_email.sql.
--
-- The point is for someone to sign in with shared credentials, see how the
-- app works on invented memories, and be unable to touch anything. Hiding
-- the buttons would not be enough: the anon key ships in the browser bundle,
-- so anyone can call the API without ever loading our interface. The lock
-- has to be here.

alter table public.profiles add column is_demo boolean not null default false;
alter table public.couples add column is_demo boolean not null default false;

-- Two flags rather than one, because there are two ways in:
--   the demo account writing anywhere, and
--   anybody writing into the demo diary — somebody handed the invite code.
-- Both are closed.

-- security definer so these can be read from inside a policy on the very
-- table they consult, which would otherwise recurse.
create function public.is_demo_account()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select coalesce((select p.is_demo from public.profiles p where p.id = auth.uid()), false);
$$;

create function public.is_demo_diary(p_couple_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select coalesce((select c.is_demo from public.couples c where c.id = p_couple_id), false);
$$;

-- Reading is untouched throughout; only the writes are rewritten.

drop policy "members can create categories" on public.categories;
create policy "members can create categories"
  on public.categories for insert
  with check (
    public.is_couple_member(couple_id)
    and not public.is_demo_account()
    and not public.is_demo_diary(couple_id)
  );

drop policy "members can update categories" on public.categories;
create policy "members can update categories"
  on public.categories for update
  using (
    public.is_couple_member(couple_id)
    and not public.is_demo_account()
    and not public.is_demo_diary(couple_id)
  );

drop policy "members can delete categories" on public.categories;
create policy "members can delete categories"
  on public.categories for delete
  using (
    public.is_couple_member(couple_id)
    and not public.is_demo_account()
    and not public.is_demo_diary(couple_id)
  );

drop policy "members can create memories" on public.memories;
create policy "members can create memories"
  on public.memories for insert
  with check (
    public.is_couple_member(couple_id)
    and created_by = auth.uid()
    and not public.is_demo_account()
    and not public.is_demo_diary(couple_id)
  );

drop policy "members can update memories" on public.memories;
create policy "members can update memories"
  on public.memories for update
  using (
    public.is_couple_member(couple_id)
    and not public.is_demo_account()
    and not public.is_demo_diary(couple_id)
  );

drop policy "members can delete memories" on public.memories;
create policy "members can delete memories"
  on public.memories for delete
  using (
    public.is_couple_member(couple_id)
    and not public.is_demo_account()
    and not public.is_demo_diary(couple_id)
  );

drop policy "members can create media" on public.media;
create policy "members can create media"
  on public.media for insert
  with check (
    exists (
      select 1 from public.memories m
      where m.id = memory_id
        and public.is_couple_member(m.couple_id)
        and not public.is_demo_diary(m.couple_id)
    )
    and not public.is_demo_account()
  );

drop policy "members can delete media" on public.media;
create policy "members can delete media"
  on public.media for delete
  using (
    exists (
      select 1 from public.memories m
      where m.id = memory_id
        and public.is_couple_member(m.couple_id)
        and not public.is_demo_diary(m.couple_id)
    )
    and not public.is_demo_account()
  );

-- Storage keeps objects under {couple_id}/..., so the first folder says
-- which diary a file belongs to.
drop policy "members can upload media objects" on storage.objects;
create policy "members can upload media objects"
  on storage.objects for insert
  with check (
    bucket_id = 'media'
    and public.is_couple_member(((storage.foldername(name))[1])::uuid)
    and not public.is_demo_account()
    and not public.is_demo_diary(((storage.foldername(name))[1])::uuid)
  );

drop policy "members can delete their couple's media objects" on storage.objects;
create policy "members can delete their couple's media objects"
  on storage.objects for delete
  using (
    bucket_id = 'media'
    and public.is_couple_member(((storage.foldername(name))[1])::uuid)
    and not public.is_demo_account()
    and not public.is_demo_diary(((storage.foldername(name))[1])::uuid)
  );

-- The profile holds the display name everyone sharing the demo would see,
-- and the weekly email switch. Neither is anyone's to change here.
drop policy "profiles are editable by the user themselves" on public.profiles;
create policy "profiles are editable by the user themselves"
  on public.profiles for update
  using (id = auth.uid() and not public.is_demo_account());

-- The functions bypass RLS by design, so each needs telling separately.
create or replace function public.create_couple(p_name text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_couple_id uuid;
  v_code text;
  v_attempts int := 0;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if public.is_demo_account() then
    raise exception 'The demo account cannot create diaries';
  end if;

  loop
    v_code := 'MH-' || upper(substr(md5(random()::text), 1, 4)) || '-' || upper(substr(md5(random()::text), 1, 4));
    v_attempts := v_attempts + 1;
    exit when not exists (select 1 from public.couples where invite_code = v_code) or v_attempts > 10;
  end loop;

  insert into public.couples (name, invite_code, created_by)
  values (p_name, v_code, auth.uid())
  returning id into v_couple_id;

  insert into public.couple_members (couple_id, user_id, role)
  values (v_couple_id, auth.uid(), 'owner');

  return v_couple_id;
end;
$$;

create or replace function public.join_couple_by_code(p_code text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_couple_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if public.is_demo_account() then
    raise exception 'The demo account cannot join diaries';
  end if;

  select id into v_couple_id from public.couples where invite_code = p_code;

  if v_couple_id is null then
    raise exception 'Invalid invite code';
  end if;

  -- And nobody joins the demo diary, however they came by the code: a
  -- member could not write to it anyway, and it would show up in their
  -- switcher for good.
  if (select is_demo from public.couples where id = v_couple_id) then
    raise exception 'Invalid invite code';
  end if;

  insert into public.couple_members (couple_id, user_id, role)
  values (v_couple_id, auth.uid(), 'member')
  on conflict (couple_id, user_id) do nothing;

  return v_couple_id;
end;
$$;

create or replace function public.leave_couple(p_couple_id uuid)
returns boolean
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if public.is_demo_account() then
    raise exception 'The demo account cannot leave diaries';
  end if;

  delete from public.couple_members
  where couple_id = p_couple_id and user_id = auth.uid();

  if not found then
    raise exception 'Not a member of this diary';
  end if;

  if not exists (select 1 from public.couple_members where couple_id = p_couple_id) then
    delete from public.couples where id = p_couple_id;
    return true;
  end if;

  if not exists (
    select 1 from public.couple_members where couple_id = p_couple_id and role = 'owner'
  ) then
    update public.couple_members
    set role = 'owner'
    where couple_id = p_couple_id
      and user_id = (
        select user_id from public.couple_members
        where couple_id = p_couple_id
        order by joined_at, user_id
        limit 1
      );
  end if;

  return false;
end;
$$;

create or replace function public.delete_account()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_couple_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if public.is_demo_account() then
    raise exception 'The demo account cannot be deleted';
  end if;

  for v_couple_id in
    select couple_id from public.couple_members where user_id = auth.uid()
  loop
    perform public.leave_couple(v_couple_id);
  end loop;

  begin
    update storage.objects set owner = null where owner = auth.uid();
  exception
    when others then null;
  end;

  delete from auth.users where id = auth.uid();
end;
$$;

-- A shared account that exists to be looked at shouldn't eat one of the
-- places meant for real people, so the cap stops counting it. Both the
-- courtesy check and the trigger that enforces it are redefined together.
create or replace function public.signup_slots_left()
returns int
language sql
security definer set search_path = public
stable
as $$
  select greatest(
    0,
    (select max_accounts from public.app_settings)
    - (select count(*)::int from auth.users u
       where not coalesce((select p.is_demo from public.profiles p where p.id = u.id), false))
  );
$$;

create or replace function public.enforce_account_limit()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (
    select count(*) from auth.users u
    where not coalesce((select p.is_demo from public.profiles p where p.id = u.id), false)
  ) >= (select max_accounts from public.app_settings) then
    raise exception 'Account limit reached'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- Once the account and its diary exist, mark both. Until this runs nothing
-- above applies and the account behaves like any other:
--
--   update public.profiles p set is_demo = true, weekly_email = false
--   from auth.users u where u.id = p.id and u.email = 'demo@memory-holder.com';
--
--   update public.couples set is_demo = true where name = '<the demo diary>';
