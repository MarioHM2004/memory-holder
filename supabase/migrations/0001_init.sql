-- Memory Holder — initial schema
-- Multi-tenant: every row of user content is scoped to a "couple" (a shared diary,
-- despite the name it can hold more than two members — see couple_members).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles: 1:1 with auth.users, holds the display data we control ourselves.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are readable by the user themselves"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles are editable by the user themselves"
  on public.profiles for update
  using (id = auth.uid());

-- Auto-create a profile row whenever a new auth user signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- couples: one shared diary. Named "couple" for the product's framing, but
-- membership is not capped at two — see the "Tamaño pareja" decision in docs.
-- ---------------------------------------------------------------------------
create table public.couples (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create table public.couple_members (
  couple_id uuid not null references public.couples (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (couple_id, user_id)
);

create index couple_members_user_id_idx on public.couple_members (user_id);

alter table public.couples enable row level security;
alter table public.couple_members enable row level security;

-- Helper used throughout the RLS policies below.
create function public.is_couple_member(p_couple_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.couple_members
    where couple_id = p_couple_id and user_id = auth.uid()
  );
$$;

create policy "members can read their couple"
  on public.couples for select
  using (public.is_couple_member(id));

create policy "members can read their membership rows"
  on public.couple_members for select
  using (public.is_couple_member(couple_id));

-- Couples and memberships are never written directly by clients: creation and
-- joining go through the security-definer functions below, so no insert/update
-- policies are needed on these two tables.

-- Creates a couple, generates a unique invite code, and makes the caller its owner.
create function public.create_couple(p_name text)
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

-- Joins the caller to a couple identified by its invite code.
create function public.join_couple_by_code(p_code text)
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

  select id into v_couple_id from public.couples where invite_code = p_code;

  if v_couple_id is null then
    raise exception 'Invalid invite code';
  end if;

  insert into public.couple_members (couple_id, user_id, role)
  values (v_couple_id, auth.uid(), 'member')
  on conflict (couple_id, user_id) do nothing;

  return v_couple_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  name text not null,
  color text not null default '#A79BFF',
  icon text not null default 'sparkle',
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index categories_couple_id_idx on public.categories (couple_id);

alter table public.categories enable row level security;

create policy "members can read categories"
  on public.categories for select
  using (public.is_couple_member(couple_id));

create policy "members can create categories"
  on public.categories for insert
  with check (public.is_couple_member(couple_id));

create policy "members can update categories"
  on public.categories for update
  using (public.is_couple_member(couple_id));

create policy "members can delete categories"
  on public.categories for delete
  using (public.is_couple_member(couple_id));

-- ---------------------------------------------------------------------------
-- memories
-- ---------------------------------------------------------------------------
create table public.memories (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  title text not null,
  description text not null default '',
  memory_date date not null,
  show_in_timeline boolean not null default true,
  show_in_ruleta boolean not null default false,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index memories_couple_id_idx on public.memories (couple_id);
create index memories_couple_date_idx on public.memories (couple_id, memory_date);
create index memories_category_id_idx on public.memories (category_id);

alter table public.memories enable row level security;

create policy "members can read memories"
  on public.memories for select
  using (public.is_couple_member(couple_id));

create policy "members can create memories"
  on public.memories for insert
  with check (public.is_couple_member(couple_id) and created_by = auth.uid());

create policy "members can update memories"
  on public.memories for update
  using (public.is_couple_member(couple_id));

create policy "members can delete memories"
  on public.memories for delete
  using (public.is_couple_member(couple_id));

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger memories_set_updated_at
  before update on public.memories
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- media (photos/videos attached to a memory)
-- ---------------------------------------------------------------------------
create table public.media (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories (id) on delete cascade,
  storage_path text not null,
  media_type text not null check (media_type in ('image', 'video')),
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index media_memory_id_idx on public.media (memory_id);

alter table public.media enable row level security;

create policy "members can read media"
  on public.media for select
  using (
    exists (
      select 1 from public.memories m
      where m.id = memory_id and public.is_couple_member(m.couple_id)
    )
  );

create policy "members can create media"
  on public.media for insert
  with check (
    exists (
      select 1 from public.memories m
      where m.id = memory_id and public.is_couple_member(m.couple_id)
    )
  );

create policy "members can delete media"
  on public.media for delete
  using (
    exists (
      select 1 from public.memories m
      where m.id = memory_id and public.is_couple_member(m.couple_id)
    )
  );

-- ---------------------------------------------------------------------------
-- storage: a single "media" bucket, objects namespaced as {couple_id}/{memory_id}/{file}
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('media', 'media', false)
on conflict (id) do nothing;

create policy "members can read their couple's media objects"
  on storage.objects for select
  using (
    bucket_id = 'media'
    and public.is_couple_member(((storage.foldername(name))[1])::uuid)
  );

create policy "members can upload media objects"
  on storage.objects for insert
  with check (
    bucket_id = 'media'
    and public.is_couple_member(((storage.foldername(name))[1])::uuid)
  );

create policy "members can delete their couple's media objects"
  on storage.objects for delete
  using (
    bucket_id = 'media'
    and public.is_couple_member(((storage.foldername(name))[1])::uuid)
  );
