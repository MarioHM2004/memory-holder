-- Memory Holder — a ceiling on how many accounts exist
--
-- Run once in the SQL Editor after 0004_delete_account.sql.
--
-- The diary is open to anyone, but it runs on free tiers paid for by nobody:
-- one gigabyte of storage for everyone's photos, a hundred emails a day. A
-- single link shared somewhere popular would take it down for the people
-- already using it. A cap turns that from a risk into a number.
--
-- To make room for someone, raise it:
--     update public.app_settings set max_accounts = 30;
-- It applies immediately; nothing needs redeploying.

create table public.app_settings (
  -- One row, forever: the primary key can only ever hold true.
  id boolean primary key default true,
  max_accounts int not null check (max_accounts >= 0),
  constraint app_settings_single_row check (id)
);

alter table public.app_settings enable row level security;
-- Deliberately no policies: nothing reaches this table through the API. The
-- two functions below are security definer and read it directly.

insert into public.app_settings (max_accounts) values (15);

-- How many accounts could still be created. The signup page asks before
-- drawing the form, so someone who can't register is told so instead of
-- filling it in and being turned away.
create function public.signup_slots_left()
returns int
language sql
security definer set search_path = public
stable
as $$
  select greatest(
    0,
    (select max_accounts from public.app_settings) - (select count(*)::int from auth.users)
  );
$$;

grant execute on function public.signup_slots_left() to anon, authenticated;

-- The enforcement, as opposed to the courtesy above. The anon key is public —
-- it ships in the browser bundle — so anyone can call Supabase's signup
-- endpoint directly and never see our form. Only the database can actually
-- hold the line.
create function public.enforce_account_limit()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (select count(*) from auth.users) >= (select max_accounts from public.app_settings) then
    raise exception 'Account limit reached'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger enforce_account_limit
  before insert on auth.users
  for each row execute function public.enforce_account_limit();
