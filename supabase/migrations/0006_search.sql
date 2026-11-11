-- Memory Holder — searching the diary
--
-- Run once in the SQL Editor after 0005_account_limit.sql.
--
-- Not Postgres full-text search, deliberately. tsvector wants to know the
-- language so it can stem, and these diaries mix Spanish, English and
-- Chinese inside the same entry. Worse, the default parser splits on spaces,
-- and Chinese has none: a whole sentence becomes one token and nothing is
-- ever found. Matching substrings with trigrams knows nothing about language,
-- which is exactly what's wanted here.

create extension if not exists pg_trgm;
create extension if not exists unaccent;

-- unaccent() is only STABLE, because a dictionary could in principle be
-- redefined, and Postgres won't index or generate a column from anything
-- short of IMMUTABLE. Pinning the dictionary makes the result constant for a
-- given input, which is the usual way around it.
create function public.immutable_unaccent(text)
returns text
language sql
immutable
parallel safe
strict
as $$
  select unaccent('unaccent'::regdictionary, $1);
$$;

-- Everything worth searching, folded once at write time: lowercased so case
-- never matters, unaccented so "cumpleanos" finds "cumpleaños".
alter table public.memories
  add column search_text text
  generated always as (
    public.immutable_unaccent(lower(coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(body, '')))
  ) stored;

-- A trigram index is what makes `ilike '%...%'` fast; a plain b-tree can't
-- help a pattern that doesn't start at the beginning of the string.
create index memories_search_text_trgm_idx
  on public.memories using gin (search_text gin_trgm_ops);

-- No new RLS policy: the column lives on `memories`, so the existing
-- "members can read memories" policy already decides who can see it.
