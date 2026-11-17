# The public demo

A button on the front page — *see how it works* — hands a visitor a diary of
their own, copied from a template full of invented memories. No account, no
address, no password. They can write memories, edit them, delete them, and add
two or three photos. It is deleted that night.

## Two pieces

**The template diary** is a real diary owned by a real account, locked
read-only by [migration 0008](../supabase/migrations/0008_demo_account.sql) so
that nothing can be written into it by accident. Its credentials are *not*
published anywhere; it exists to be copied.

**The sandboxes** are the copies, built by
[migration 0009](../supabase/migrations/0009_sandbox.sql). Each belongs to one
anonymous Supabase session and carries `couples.sandbox_expires_at`.

## Why a copy in the database, and not the browser

Keeping a visitor's changes locally would mean a second implementation of
every page and every save — one that drifts away from the real app without
anyone noticing. Every page here is rendered on the server from the database,
so the only way to show the real thing is to let them use the real thing.

A copy costs a few rows. The template's photos are *not* copied: the sandbox's
media rows point at the template's files, and the storage read policy was
widened so a visitor can see them. Only the photos they upload themselves are
new bytes, and there are at most three.

## Why the limits are in the database

The anon key ships inside the browser bundle, so anyone can call the API
without ever loading our interface. Hiding buttons would stop nobody.

- `sandbox_photo_limit()` returns 3, enforced by a trigger on `media` that
  counts only files under the sandbox's own folder, plus a looser backstop
  policy on the bucket for anyone uploading without creating a row.
- `start_sandbox()` returns the diary a visitor already has rather than making
  a second one, and refuses outright once 100 are open at once.
- An anonymous session can't create or join a diary (`is_anonymous_visitor()`
  guards `create_couple` and `join_couple_by_code`), and nobody can join a
  sandbox by its invite code. Otherwise tonight's cleanup would delete the
  account from under a real diary.
- Sessions without an address don't count against the signup cap, so visitors
  can't use up the places meant for people.
- The app's password page refuses a sandbox session: there is no address to
  sign in with, so a password would be a key to a door that isn't there.

## The nightly delete

[`/api/sandbox-cleanup`](../src/app/api/sandbox-cleanup/route.ts), driven by
[`.github/workflows/nightly.yml`](../.github/workflows/nightly.yml) at 03:37
UTC. It needs the same `SITE_URL` and `CRON_SECRET` secrets as the weekly
email.

Storage first, rows second: SQL can't reach the bucket, and once the rows are
gone there is no record of which folders existed. Then
`delete_expired_sandboxes()` removes the diaries, their rows by cascade, and
the anonymous accounts behind them. The route answers 500 if any folder
refused, so a failure is loud rather than a slow leak of orphaned photos.

## Setting it up

**1. Run migrations 0008 and 0009**, in that order. Until the flags are set
they change nothing.

**2. Enable anonymous sign-ins** in Supabase → Authentication → Sign In /
Providers. Without this the button returns an error.

**3. Create the template account** at `/signup` like any other, with an
address you own, and fill its diary with invented memories, photos and
categories — whatever you'd want a stranger to judge the app by. Do this
*before* step 4, while it can still be written to.

[`supabase/seed/demo-diary.sql`](../supabase/seed/demo-diary.sql) does the
writing for you: four years of memories in one go, which is what makes the
timeline and the roulette worth looking at. It needs the account to exist
already (put its address in the one line it asks for) and to have no diary
yet, because it creates the diary itself and refuses to seed into a real
one. So sign up and stop there — don't create a diary in the app first.

Either way it seeds no photos, so upload a handful by hand afterwards: those
are the ones every sandbox will show. The seeded text is Spanish, so a
visitor reading in English or Chinese gets a translated interface around a
Spanish diary; a few hand-written memories in the other two languages fix
the first impression if it bothers you.

**4. Mark both**, in the SQL editor:

```sql
update public.profiles p set is_demo = true, weekly_email = false
from auth.users u where u.id = p.id and u.email = 'demo@memory-holder.com';

update public.couples set is_demo = true where name = '<the template diary>';
```

From here it is read-only. To add memories later, flip `is_demo` to false,
write them, and flip it back. New sandboxes pick up the changes; the ones
already open keep what they copied.

**5. Set `DEMO_ENABLED=true` in Vercel** (Production) and redeploy. The front
page only offers the button when it is set, so nothing advertises a door that
opens onto an error.

## What a visitor sees

A line at the top of every page says the diary is theirs to play with and that
it disappears tonight. Without it, a copy of someone else's memories reads as
a mistake.

The admin panel is theirs, minus the two tabs that would only confuse: the
diary's invite code and members, and the account settings for an account they
don't have. Over the photo limit, the upload says so in their own language
rather than repeating the trigger's name at them.
