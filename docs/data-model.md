# Data model

Source of truth: [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql).
The TypeScript types in [`src/lib/types/database.ts`](../src/lib/types/database.ts)
are hand-written to match it — if you change the SQL, update that file too (or better,
once the project is linked to a real Supabase project, replace it with
`supabase gen types typescript`).

## Tables

```
auth.users (managed by Supabase Auth)
  │
  ├─ profiles            1:1, display_name shown in the UI
  │
  └─ couple_members ──── couples
                            │
                            ├─ categories
                            │     │
                            └─ memories ── media
```

| Table | Purpose | Notable columns |
|---|---|---|
| `profiles` | Display data for a user, auto-created by a trigger on signup. | `display_name` |
| `couples` | One row per diary. | `invite_code` (unique), `created_by` |
| `couple_members` | Who belongs to which diary. | `role` (`owner`/`member`) — advisory only, both roles have the same permissions today |
| `categories` | Per-couple topics (Work, Sports...). | `name`, `color`, `icon`, `position` |
| `memories` | The actual diary entries. | `category_id` (nullable — "no category" is valid), `memory_date`, `show_in_timeline`, `show_in_ruleta` |
| `media` | Photos/videos attached to a memory. | `storage_path`, `media_type` (`image`/`video`), `position` |

`show_in_timeline` and `show_in_ruleta` are independent booleans set per memory in
the admin form — a memory can appear on the timeline, in the roulette, both, or
neither.

## Row Level Security

Every table has RLS enabled. The pattern is the same everywhere: a
`is_couple_member(couple_id)` SQL function (`SECURITY DEFINER`, checks
`couple_members` for `auth.uid()`) gates every policy. `media` reaches the couple
through its parent `memories` row since it has no `couple_id` of its own.

`couples` and `couple_members` have **no insert/update policies** — rows are only
ever created through two `SECURITY DEFINER` functions:

- `create_couple(p_name)` — creates the couple, generates a unique `MH-XXXX-XXXX`
  invite code, and inserts the caller as `owner`.
- `join_couple_by_code(p_code)` — looks up the code and inserts the caller as
  `member`. No cap on membership size (see the "Tamaño pareja" note in
  `architecture.md`) — anyone with the code can join, not just a second person.

## Storage

A single private `media` bucket, created by the migration
(`insert into storage.buckets`). Objects are namespaced as
`{couple_id}/{memory_id}/{uuid}-{filename}`, and the Storage policies check
`is_couple_member` against the first path segment — the same tenant boundary as the
database tables, just expressed over `storage.foldername(name)` instead of a column.
