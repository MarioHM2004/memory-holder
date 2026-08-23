# Architecture

## Overview

```
┌──────────────────────────┐        ┌───────────────────────────────┐
│   Next.js (Vercel)       │        │           Supabase             │
│                           │        │                                 │
│  App Router               │◄──────►│  Auth (email + password)       │
│  Server Components/       │        │  Postgres + Row Level Security │
│    Actions for reads/     │        │    (every row scoped by        │
│    writes                 │        │    couple_id)                  │
│  next-intl (en/es/zh)     │        │  Storage (private "media"      │
│                           │        │    bucket)                     │
└──────────────────────────┘        └───────────────────────────────┘
```

There is no separate backend service: Server Components read data directly through a
per-request Supabase client, and Server Actions handle every mutation (creating a
memory, saving a category, joining a couple, uploading media, signing out). Supabase
Auth issues the session cookie; `src/proxy.ts` refreshes it on every request.

## Multi-tenancy: "couples"

The product supports multiple independent diaries from day one, not just one couple.
The tenant boundary is the **couple**:

- `couples` — one row per diary.
- `couple_members` — join table between `auth.users` and `couples`. Despite the name,
  membership isn't capped at two — see the "Tamaño pareja" decision below.
- Every content table (`categories`, `memories`, `media`) carries a `couple_id` (or,
  for `media`, reaches one through its parent `memory`), and Row Level Security
  policies check `is_couple_member(couple_id)` on every read and write. This means
  the isolation between diaries is enforced by Postgres itself, not just by
  application code — even a bug in a Server Action can't leak one couple's data to
  another.

A couple is created or joined through two `SECURITY DEFINER` Postgres functions
(`create_couple`, `join_couple_by_code`) rather than direct table inserts, so invite
codes are generated atomically and members can't self-insert into an arbitrary
couple. See [`data-model.md`](data-model.md) for the full schema.

## Auth vs. authorization

Two different layers, on purpose:

- **`src/proxy.ts`** (Next.js 16 renamed `middleware.ts` to `proxy.ts`) only refreshes
  the Supabase session cookie. It does not decide who can see what.
- **`src/lib/data/couple-context.ts`** (`requireCoupleContext`) is the actual
  authorization gate, called from `src/app/(app)/layout.tsx`: no session → redirect
  to `/login`; session but no couple membership yet → redirect to `/onboarding`.

This follows Next's own guidance to treat the network boundary (proxy) and the
authorization/data-access layer as separate concerns — proxy can be bypassed or
skipped by edge configuration, so real access control lives next to the data.

## Navigation: what's reachable from the rail, on purpose

The left nav only ever links to Home, Roulette, Timeline, Categories, and Admin. Two
real pages are intentionally **not** in that list:

- `/categories/[categoryId]` (the bubble canvas for one category) — reachable only by
  clicking a category tile.
- `/memories/[memoryId]` (a single memory's full view) — reachable only from the
  roulette's result card, a timeline card, or a bubble.

This mirrors a product decision made during design: these are "drill-down" screens,
not top-level destinations, so they shouldn't appear as such in navigation. Nothing
stops you from typing the URL directly (RLS still protects the data either way) — the
rail just doesn't advertise them.

## Internationalization

Locale is **not** part of the URL. This is a private, authenticated app with no need
for per-language SEO, so `next-intl` is configured in "no routing" mode
(`src/i18n/request.ts`): the active locale lives in a `locale` cookie, defaulting to
`en`. `src/i18n/actions.ts` exposes a Server Action that sets the cookie; because
Server Actions that mutate cookies automatically re-render the current route in the
same response, switching language updates the whole page immediately with no client
router refresh needed.

English (`messages/en.json`) is the source language — write new UI copy there first,
then add the Spanish and Chinese equivalents alongside it.

## Media uploads

Server Actions cap request bodies at 1MB by default (raised slightly here for form
fields, see `next.config.ts`), which is far too small for photos and especially
video. Uploads instead go **directly from the browser to Supabase Storage**
(`src/app/(app)/admin/memory-form.tsx`, using the browser Supabase client), scoped by
the same `couple_id` Storage RLS policies as everything else. Only the resulting
storage path is sent to a Server Action (`attachMediaAction`) to record in the
`media` table — a tiny text payload, no size concerns.
