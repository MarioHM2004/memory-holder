# Deployment

Target stack agreed on during planning: **Vercel** for the app, **Supabase** for
database/auth/storage. Both have a free tier that comfortably covers a personal
project; you only pay if usage grows well beyond two people's photos and videos.

## 1. Supabase (production project)

1. Create a project at [supabase.com](https://supabase.com) — use a separate project
   from whatever you used for local development, so testing never touches real data.
2. SQL Editor → run [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql).
3. Settings → API: copy the **Project URL** and the **anon public** key. You'll need
   these as environment variables in Vercel.
4. Authentication → Providers: email/password is enabled by default, which is all
   this app uses. Authentication → URL Configuration: add your production domain
   once you have one (step 3 below) so signup confirmation emails link back correctly.

## 2. Vercel

1. Import the GitHub repo into Vercel.
2. Framework preset: Next.js (auto-detected).
3. Environment variables (Project Settings → Environment Variables), same names as
   `.env.example`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy. Vercel builds with `next build` and serves the app; `src/proxy.ts` runs on
   Vercel's infrastructure automatically, no extra configuration needed.

## 3. After the first deploy

- Go back to Supabase → Authentication → URL Configuration and set the **Site URL**
  to your Vercel domain, so confirmation/invite emails point to the right place.
- Sign up, create your diary, and share the invite code from the admin panel's
  "Invite" tab with whoever else should join.

## Updating the schema later

New tables/columns/policies go in a new file under `supabase/migrations/`
(`0002_...sql`, etc.) — never edit `0001_init.sql` after it's been applied anywhere,
since Supabase tracks which migrations have already run. Run the new file the same
way: SQL Editor, or `supabase db push` if you're using the CLI.
