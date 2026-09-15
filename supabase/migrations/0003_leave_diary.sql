-- Memory Holder — leaving a diary
--
-- couple_members has no delete policy: memberships are only ever written by
-- security-definer functions (see create_couple / join_couple_by_code in
-- 0001_init.sql), and leaving follows the same pattern.
--
-- Run it once in the SQL Editor after 0002_editing_presence.sql.

-- Removes the caller from a diary. Returns true when that left the diary with
-- nobody in it, in which case the diary is deleted along with everything in
-- it (memories, media rows and categories cascade from couples).
--
-- The photo files themselves live in Storage, which SQL can't clean up. The
-- app removes them before calling this, while the caller is still a member
-- and the storage policies still let them.
create function public.leave_couple(p_couple_id uuid)
returns boolean
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
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

  -- An owner leaving shouldn't leave a diary without one: the longest-standing
  -- remaining member takes over.
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
