-- Memory Holder — who has a memory open for editing
--
-- The admin panel joins a private Realtime channel per diary, named
-- "editing:<couple id>", and uses presence to announce which memory's edit
-- form each tab has open (see src/lib/use-editing-presence.ts). Because the
-- channel is private, these policies on realtime.messages decide who may join:
-- only members of that diary, and only for presence.
--
-- Run it once in the SQL Editor after 0001_init.sql.

create policy "members can see who is editing their diary"
  on realtime.messages for select
  to authenticated
  using (
    realtime.messages.extension = 'presence'
    and exists (
      select 1 from public.couple_members
      where user_id = auth.uid()
        and (select realtime.topic()) = 'editing:' || couple_id::text
    )
  );

create policy "members can announce what they are editing"
  on realtime.messages for insert
  to authenticated
  with check (
    realtime.messages.extension = 'presence'
    and exists (
      select 1 from public.couple_members
      where user_id = auth.uid()
        and (select realtime.topic()) = 'editing:' || couple_id::text
    )
  );
