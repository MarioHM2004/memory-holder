# The Sunday email

Every Sunday each member gets one memory from their own diaries, chosen at
random — the roulette, arriving on its own. A diary only works if you come
back to it, and nothing else in the app ever asks you to.

## How it runs

[`.github/workflows/weekly-email.yml`](../.github/workflows/weekly-email.yml)
wakes up and POSTs to `/api/weekly-digest` with a shared secret. The app does
the rest: it already holds the translations, the photo URLs and the template,
and Vercel's own cron is a paid feature.

[The endpoint](../src/app/api/weekly-digest/route.ts) calls `weekly_digest()`
(migration 0007), which returns one random memory per subscribed member in a
single query, then signs the photos in one batch and sends through Resend's
API. A failed send doesn't stop the others, and the response is a 500 if any
of them failed, so the workflow goes red rather than losing somebody's email
in silence.

## Setting it up

**1. Run migration 0007.** It adds three columns to `profiles` —
`weekly_email`, `unsubscribe_token`, `locale` — plus the two functions.

`weekly_email` defaults to **true** for everyone, including accounts that
already exist. It's about their own diary rather than marketing, and a
setting nobody finds is a feature nobody has, but it does mean the first
Sunday after deploying, everyone gets one. If you'd rather start the other
way round, run this before the first send:

```sql
update public.profiles set weekly_email = false;
```

**2. Environment variables in Vercel**, all three Secret:

| Name | Where from |
|---|---|
| `RESEND_API_KEY` | The same Resend key already used for SMTP |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API, the `service_role` key |
| `CRON_SECRET` | Invent a long random string |

**`SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security completely.** It
reads and writes every diary in the database. It's here because nobody is
signed in when a cron runs and the job has to look across all of them;
[`lib/supabase/admin.ts`](../src/lib/supabase/admin.ts) is the only thing that
touches it, and `CRON_SECRET` is the only thing in front of the endpoint. Keep
it out of anything with `NEXT_PUBLIC_` in the name.

**3. Secrets in GitHub**, under Settings → Secrets and variables → Actions:
`SITE_URL` and `CRON_SECRET` — the same value as in Vercel.

**4. Redeploy**, then run it by hand: Actions → Weekly email → Run workflow.
The log prints how many people it found, how many it sent, and the reason for
any that failed.

## Unsubscribing

Two routes, deliberately:

- **The visible link** goes to `/unsubscribe/<token>`, a page that **asks
  first**. Clicking a link is a GET, and inboxes fetch those by themselves to
  build previews and scan for malware — a page that unsubscribed on sight
  would do it to people who never clicked.
- **`List-Unsubscribe`** headers point a mail client's own unsubscribe button
  at `/api/unsubscribe/<token>`, which is POST only for the same reason.

The token grants nothing else. The worst a leaked one does is stop an email,
and the person can turn it back on under Admin panel → Account.

## Things worth knowing

- **Photos are signed for 8 days.** An email has no session, so `/media`
  can't serve it; the link is a signed Supabase URL instead, good for long
  enough that opening Sunday's email on Friday still shows the picture.
- **Nobody with an empty diary is emailed.** The query drops them rather than
  sending a message about nothing.
- **The language comes from `profiles.locale`**, written whenever a signed-in
  person changes language. A cron can't read the cookie the app normally uses.
- **Resend's free tier is 100 emails a day**, which is the real ceiling on how
  many people this can serve.
