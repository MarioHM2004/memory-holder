# Memory Holder

A shared digital diary for couples - a roulette of unique memories, a timeline, and
topic categories (work, studies, hobbies, sports...) for photos and videos. Built to
be generic: the app ships with no content of its own, and every couple that signs up
gets their own private, isolated diary they fill in themselves.

Available in English, Spanish, and Chinese (switchable from the UI, no reload needed).

## Stack

- **Next.js 16** (App Router, Server Actions, Turbopack)
- **Supabase** — Postgres, Auth, and Storage, with Row Level Security enforcing that
  a diary's data is only ever visible to its own members
- **Tailwind CSS v4** for styling, **next-intl** for translations
- Deploy target: Vercel (app) + Supabase (database/auth/storage)

See [`docs/architecture.md`](docs/architecture.md) for how these fit together, and
[`docs/data-model.md`](docs/data-model.md) for the database schema.

## Getting started

### 1. Create a Supabase project

Create a project at [supabase.com](https://supabase.com), then open the SQL Editor
and run the migration in [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
It creates every table, the Row Level Security policies, the `create_couple` /
`join_couple_by_code` functions used by onboarding, and the private `media` storage
bucket used for photos and videos.

Then run [`supabase/migrations/0002_editing_presence.sql`](supabase/migrations/0002_editing_presence.sql)
as well. It lets members of a diary join the realtime channel that stops two
people from editing the same memory at once.

And [`supabase/migrations/0003_leave_diary.sql`](supabase/migrations/0003_leave_diary.sql),
the function behind leaving a diary.

If you have the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)
set up instead, `supabase db push` applies the same migration.

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from your
Supabase project's **Settings → API** page.

### 3. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The first visit will ask you to
sign up, then either create a new diary (which generates an invite code) or join one
with a code someone shared with you.

## Project structure

```
src/
  app/
    login/, signup/, onboarding/     — auth + first-run flow (own layout, no nav rail)
    (app)/                           — everything behind requireCoupleContext()
      layout.tsx                     — the nav rail shell + auth/couple guard
      page.tsx                       — home
      roulette/, timeline/, categories/, categories/[categoryId]/
      memories/[memoryId]/           — memory detail; reachable only from roulette,
                                        timeline or a category, never from the nav rail
      admin/                         — memories/categories CRUD + invite code
  components/                        — shared UI (nav rail, carousels, form fields...)
  lib/
    supabase/                        — browser/server Supabase clients
    data/                            — data-access helpers (Server Component-only)
    types/database.ts                — hand-written types matching the SQL schema
  i18n/                              — locale cookie, next-intl request config
messages/{en,es,zh}.json             — UI strings (en is the source language)
supabase/migrations/                 — SQL schema + RLS policies
```

## Notes on the current state

- Visual design (colors, spacing, component styling) is a first pass — expect to
  revisit it; it isn't meant to be final.
- Deleting a memory's photos/videos from Storage on memory delete isn't implemented
  yet (the database rows cascade-delete, but the underlying Storage objects are left
  orphaned). Fine for a personal project at this stage, worth fixing before scaling up.
- No automated tests yet.
