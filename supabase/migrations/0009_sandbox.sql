-- Memory Holder — a diary to try, without an account
--
-- Run once in the SQL Editor after 0008_demo_account.sql.
--
-- Someone presses "try it" on the front page and gets a diary of their own,
-- copied from the demo one, which they can write in like any member. It is
-- deleted that night.
--
-- The alternative was keeping their changes in the browser, which means a
-- second implementation of every page and every save — one that drifts away
-- from the real app without anyone noticing. This way the demo cannot be
-- out of date, because it is the app.

alter table public.couples add column sandbox_expires_at timestamptz;

comment on column public.couples.sandbox_expires_at is
  'Set only on throwaway diaries made by start_sandbox(); null on real ones.';

create index couples_sandbox_expires_idx on public.couples (sandbox_expires_at)
  where sandbox_expires_at is not null;

-- How many photos someone may add to a sandbox before being told that's
-- enough. Low on purpose: the free tier holds a gigabyte for everyone, and
-- this is the one thing a visitor can do that costs real space. Three is
-- enough to see an upload work.
create function public.sandbox_photo_limit() returns int
  language sql immutable as $$ select 3 $$;

create function public.is_sandbox_diary(p_couple_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select coalesce(
    (select c.sandbox_expires_at is not null from public.couples c where c.id = p_couple_id),
    false
  );
$$;

/* -------------------------------------------------------------------------
 * Starting one
 * ---------------------------------------------------------------------- */

create function public.start_sandbox()
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_template uuid;
  v_couple uuid;
  v_code text;
  v_open int;
  v_new_id uuid;
  r record;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- One each. Pressing the button twice returns to the diary already made
  -- rather than leaving an abandoned one behind every time.
  select cm.couple_id into v_couple
  from public.couple_members cm
  join public.couples c on c.id = cm.couple_id
  where cm.user_id = auth.uid() and c.sandbox_expires_at is not null
  limit 1;
  if v_couple is not null then
    return v_couple;
  end if;

  -- Nobody may hold a diary open for someone else: a ceiling on how many
  -- exist at once, cleared nightly, is what keeps a script from filling the
  -- database with them.
  select count(*) into v_open from public.couples where sandbox_expires_at > now();
  if v_open >= 100 then
    raise exception 'Too many demos open right now';
  end if;

  select id into v_template from public.couples where is_demo limit 1;
  if v_template is null then
    raise exception 'No demo diary to copy from';
  end if;

  -- An invite code is still unique and still required by the column, but
  -- it is never shown: a diary that disappears tonight is not one to join.
  v_code := 'MH-TRY-' || upper(substr(md5(random()::text), 1, 6));

  insert into public.couples (name, invite_code, created_by, sandbox_expires_at)
  select c.name, v_code, auth.uid(), now() + interval '1 day'
  from public.couples c where c.id = v_template
  returning id into v_couple;

  insert into public.couple_members (couple_id, user_id, role)
  values (v_couple, auth.uid(), 'owner');

  -- Categories first: the memories copied below point at them.
  --
  -- Copied row by row rather than with one INSERT ... SELECT. Matching the
  -- new ids back to the old ones would mean joining on title and date, and
  -- two memories sharing both would silently cross their photos over.
  create temporary table copied_categories (old_id uuid, new_id uuid) on commit drop;

  for r in select * from public.categories where couple_id = v_template order by position, id
  loop
    insert into public.categories (couple_id, name, color, icon, position)
    values (v_couple, r.name, r.color, r.icon, r.position)
    returning id into v_new_id;

    insert into copied_categories values (r.id, v_new_id);
  end loop;

  for r in select * from public.memories where couple_id = v_template order by memory_date, id
  loop
    insert into public.memories (
      couple_id, category_id, title, description, body,
      memory_date, show_in_timeline, show_in_ruleta, created_by
    )
    values (
      v_couple,
      (select cc.new_id from copied_categories cc where cc.old_id = r.category_id),
      r.title, r.description, r.body,
      r.memory_date, r.show_in_timeline, r.show_in_ruleta, auth.uid()
    )
    returning id into v_new_id;

    -- The rows are copied; the files are not. Both diaries point at the same
    -- objects in the demo's folder, which the storage policy below lets any
    -- signed-in visitor read. Nothing is duplicated in the bucket, and
    -- deleting a copied photo here must not take the original with it — see
    -- deleteMediaAction, which only removes files under the diary's own
    -- folder. The photo limit counts by folder for the same reason, so these
    -- don't use up anyone's allowance.
    insert into public.media (memory_id, storage_path, thumbnail_path, preview_path, media_type, position)
    select v_new_id, m.storage_path, m.thumbnail_path, m.preview_path, m.media_type, m.position
    from public.media m
    where m.memory_id = r.id;
  end loop;

  return v_couple;
end;
$$;

grant execute on function public.start_sandbox() to authenticated;

/* -------------------------------------------------------------------------
 * Living in one
 * ---------------------------------------------------------------------- */

-- 0008 shut every write to a demo diary. A sandbox is a copy of it, not it,
-- so those policies already allow writing here — except that the account
-- doing the writing must not be the demo account itself.

-- The demo's photos have to be readable by whoever is trying the app out,
-- since their copied memories point straight at them.
drop policy "members can read their couple's media objects" on storage.objects;
create policy "members can read their couple's media objects"
  on storage.objects for select
  using (
    bucket_id = 'media'
    and (
      public.is_couple_member(((storage.foldername(name))[1])::uuid)
      or public.is_demo_diary(((storage.foldername(name))[1])::uuid)
    )
  );

-- The visible limit: three photos of their own per sandbox. Counted by
-- storage path, so the ones copied from the demo don't use up the allowance.
create function public.enforce_sandbox_photo_limit()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_couple uuid;
  v_used int;
begin
  select m.couple_id into v_couple from public.memories m where m.id = new.memory_id;
  if not public.is_sandbox_diary(v_couple) then
    return new;
  end if;

  select count(*) into v_used
  from public.media md
  join public.memories m2 on m2.id = md.memory_id
  where m2.couple_id = v_couple
    and md.storage_path like v_couple::text || '/%';

  if v_used >= public.sandbox_photo_limit() then
    raise exception 'sandbox_photo_limit'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger enforce_sandbox_photo_limit
  before insert on public.media
  for each row execute function public.enforce_sandbox_photo_limit();

-- And a backstop on the bucket itself. The trigger above stops the row; this
-- stops the bytes, for anyone uploading without ever creating one. Loose,
-- because a photo can leave up to three objects behind.
drop policy "members can upload media objects" on storage.objects;
create policy "members can upload media objects"
  on storage.objects for insert
  with check (
    bucket_id = 'media'
    and public.is_couple_member(((storage.foldername(name))[1])::uuid)
    and not public.is_demo_account()
    and not public.is_demo_diary(((storage.foldername(name))[1])::uuid)
    and (
      not public.is_sandbox_diary(((storage.foldername(name))[1])::uuid)
      or (
        select count(*) from storage.objects o
        where o.bucket_id = 'media'
          and (storage.foldername(o.name))[1] = (storage.foldername(name))[1]
      ) < public.sandbox_photo_limit() * 3
    )
  );

/* -------------------------------------------------------------------------
 * Clearing them out
 * ---------------------------------------------------------------------- */

-- Returns what it deleted so the nightly job can empty those storage folders
-- first — SQL cannot reach the bucket, and the rows are the only record of
-- which folders existed.
create function public.expired_sandboxes()
returns table (couple_id uuid)
language sql
security definer set search_path = public
stable
as $$
  select id from public.couples where sandbox_expires_at <= now();
$$;

create function public.delete_expired_sandboxes()
returns int
language plpgsql
security definer set search_path = public
as $$
declare
  v_deleted int;
begin
  -- Members, memories, media rows and categories all cascade from here.
  delete from public.couples where sandbox_expires_at <= now();
  get diagnostics v_deleted = row_count;

  -- The anonymous accounts those diaries belonged to. They hold nothing —
  -- no address, no membership — and would otherwise pile up in auth.users
  -- forever.
  delete from auth.users u
  where u.email is null
    and not exists (select 1 from public.couple_members cm where cm.user_id = u.id);

  return v_deleted;
end;
$$;

revoke execute on function public.expired_sandboxes() from public, anon, authenticated;
revoke execute on function public.delete_expired_sandboxes() from public, anon, authenticated;
grant execute on function public.expired_sandboxes() to service_role;
grant execute on function public.delete_expired_sandboxes() to service_role;

/* -------------------------------------------------------------------------
 * Anonymous visitors
 * ---------------------------------------------------------------------- */

-- They sign in without an address, so they must not eat the places meant
-- for people who did. Checked on email rather than on is_anonymous, which
-- is a column not every project has.
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
       where u.email is not null
         and not coalesce((select p.is_demo from public.profiles p where p.id = u.id), false))
  );
$$;

create or replace function public.enforce_account_limit()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.email is null then
    return new;
  end if;

  if (
    select count(*) from auth.users u
    where u.email is not null
      and not coalesce((select p.is_demo from public.profiles p where p.id = u.id), false)
  ) >= (select max_accounts from public.app_settings) then
    raise exception 'Account limit reached'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- A visitor is not a member of anything but the diary they were handed.
--
-- Without this, someone trying the app out could press "create a diary" or
-- paste an invite code, and tonight's cleanup would delete the account from
-- under it: a real diary with nobody in it, or a real diary with one member
-- fewer and no explanation. start_sandbox is the only door.
create function public.is_anonymous_visitor()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select auth.uid() is not null
    and (select email from auth.users where id = auth.uid()) is null;
$$;

grant execute on function public.is_anonymous_visitor() to authenticated;

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

  if public.is_anonymous_visitor() then
    raise exception 'A demo visitor cannot create diaries';
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

  if public.is_anonymous_visitor() then
    raise exception 'A demo visitor cannot join diaries';
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

  -- Nor a sandbox, which is gone tonight along with the account that holds
  -- it. Its code is never shown, but it has one like every other diary.
  if public.is_sandbox_diary(v_couple_id) then
    raise exception 'Invalid invite code';
  end if;

  insert into public.couple_members (couple_id, user_id, role)
  values (v_couple_id, auth.uid(), 'member')
  on conflict (couple_id, user_id) do nothing;

  return v_couple_id;
end;
$$;

-- A visitor has no address, and the profile every account gets was named
-- after one: split_part(null, '@', 1) is null, display_name is NOT NULL, and
-- the insert that creates the profile took the anonymous sign-in down with
-- it. So the name falls back to a plain word.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Demo'
    )
  );
  return new;
end;
$$;
