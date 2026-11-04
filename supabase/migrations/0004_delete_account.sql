-- Memory Holder — deleting your own account
--
-- Run once in the SQL Editor after 0003_leave_diary.sql.

-- created_by pointed at auth.users with no delete rule, so Postgres refused to
-- remove anyone who had ever written a memory or started a diary. These rows
-- have to outlive the account: the people still in a shared diary keep every
-- memory in it, whoever happened to add them.
alter table public.memories alter column created_by drop not null;
alter table public.memories drop constraint memories_created_by_fkey;
alter table public.memories
  add constraint memories_created_by_fkey
  foreign key (created_by) references auth.users (id) on delete set null;

alter table public.couples alter column created_by drop not null;
alter table public.couples drop constraint couples_created_by_fkey;
alter table public.couples
  add constraint couples_created_by_fkey
  foreign key (created_by) references auth.users (id) on delete set null;

-- Deletes the caller's own account, and nobody else's: the id comes from
-- auth.uid() rather than an argument, so there is no account id to pass.
--
-- auth.users isn't reachable from the API, hence security definer. profiles
-- and couple_members cascade from the delete; the diaries are dealt with
-- first, through the same rules as leaving one by hand.
--
-- Photos live in Storage, which this can't clean up. The app empties the
-- folders of any diary about to disappear before calling here, while the
-- account still exists and the storage policies still allow it.
create function public.delete_account()
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

  for v_couple_id in
    select couple_id from public.couple_members where user_id = auth.uid()
  loop
    -- Deletes a diary left with nobody in it, hands ownership on otherwise.
    perform public.leave_couple(v_couple_id);
  end loop;

  -- Storage remembers who uploaded each object. On older projects that column
  -- is a foreign key to auth.users and would block the delete below; on newer
  -- ones it no longer is, and this is a harmless no-op. Either way it must not
  -- be the thing that stops someone closing their account.
  begin
    update storage.objects set owner = null where owner = auth.uid();
  exception
    when others then null;
  end;

  delete from auth.users where id = auth.uid();
end;
$$;
