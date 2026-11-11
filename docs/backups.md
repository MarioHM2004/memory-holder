# Backups

Supabase's Free Plan has no automated backups, and on **no** plan do their
backups cover Storage — the photos. So the diary is backed up by
[`.github/workflows/backup.yml`](../.github/workflows/backup.yml), which runs
every Sunday and copies two things to Cloudflare R2:

| What | Where it lands | Kept |
|---|---|---|
| The `public` schema and all its rows, plus `auth.users` when readable, as one encrypted tarball | `db/db-YYYY-MM-DD.tar.gz.gpg` | 90 days |
| Every file in the `media` bucket, mirrored | `media/...` | Until deleted from the diary |

R2 rather than anywhere inside Supabase, because a copy stored in the thing it
is meant to outlive is not a copy. Its free tier (10 GB, no charge to download)
covers this comfortably.

## One-time setup

### 1. Cloudflare R2

The backup needs four values from here: an **endpoint**, an **access key id**,
a **secret**, and the **bucket name**.

**1.1 — Make the bucket.** R2 Object Storage → Create bucket, named
`memory-holder-backup`. Leave public access off; nothing ever reads this from
a browser.

It asks where to put it, and offers two different things:

- A **location hint** (`Western Europe (WEUR)` and friends) is best-effort.
  Cloudflare tries, and usually succeeds, but promises nothing.
- A **jurisdiction** (`European Union`) is a guarantee that the objects stay
  there, and it cannot be changed after the bucket exists.

Either is defensible for a diary this size; the data lands in Europe both
ways. The jurisdiction is worth it only if you want to be able to *state*
where the backup lives. It changes the endpoint, which is why the next step
says to read the endpoint off the panel rather than assembling it.

**1.2 — Copy the endpoint.** Open the bucket → Settings → General. The **S3
API** line looks like:

```
https://<account id>.r2.cloudflarestorage.com/memory-holder-backup
```

**Drop the bucket name from the end.** What goes in `R2_ENDPOINT` is only the
host:

```
https://<account id>.r2.cloudflarestorage.com
```

An EU-jurisdiction bucket shows `.eu.r2.cloudflarestorage.com` instead; either
way, what the panel shows minus the trailing bucket name is the right answer.

**1.3 — Make the token.** Go back up to **R2 Object Storage** — the token page
is not inside the bucket. Look for **Manage API tokens**, in the panel on the
right or behind an `{} API` button at the top.

| Field | Value |
|---|---|
| Token type | **Account**, not User — it shouldn't depend on one person's login |
| Permission | **Object Read & Write** |
| Buckets | Only `memory-holder-backup` |
| TTL | No expiry, or the backups stop on a day you won't notice |

**1.4 — Take the right two values.** The page that follows shows three things,
and the most prominent one is the wrong one:

- **Token value** — for Cloudflare's own API. Not used here.
- **Access Key ID** — this is `R2_ACCESS_KEY_ID`.
- **Secret Access Key** — this is `R2_SECRET_ACCESS_KEY`.

The last two are shown once. Close the tab and you make a new token.

**1.5 — Prove it works before trusting CI.** Two minutes locally beats
debugging a workflow. Install rclone (`winget install Rclone.Rclone`), then,
in PowerShell:

```powershell
$env:RCLONE_CONFIG_R2_TYPE = "s3"
$env:RCLONE_CONFIG_R2_PROVIDER = "Cloudflare"
$env:RCLONE_CONFIG_R2_REGION = "auto"
$env:RCLONE_CONFIG_R2_ENDPOINT = "https://<account id>.r2.cloudflarestorage.com"
$env:RCLONE_CONFIG_R2_ACCESS_KEY_ID = "..."
$env:RCLONE_CONFIG_R2_SECRET_ACCESS_KEY = "..."

Set-Content test.txt "hello"
rclone copy test.txt r2:memory-holder-backup/ --s3-no-check-bucket
rclone ls r2:memory-holder-backup --s3-no-check-bucket      # should list test.txt
rclone delete r2:memory-holder-backup/test.txt --s3-no-check-bucket
```

The variables last only as long as that window. In Git Bash the same thing is
`export NAME=value`, and the rest of this file uses that form — every snippet
under Restoring is bash.

What the failures mean:

- `SignatureDoesNotMatch` — the secret is wrong, or you pasted the token value
  instead of the secret access key.
- `AccessDenied` — the token doesn't cover this bucket, or it's read-only.
- `no such host` — the endpoint still has the bucket name on the end, or the
  jurisdiction prefix is missing (or there when it shouldn't be).

### 2. Supabase S3 credentials

**Storage → S3 Connection**. The panel shows the endpoint and region; generate
an access key there too. This is how rclone reads the bucket.

### 3. The database connection string

**Connect → Session pooler**, port **5432**. Two traps, both of which the
workflow refuses up front rather than failing obscurely later:

- The direct connection (`db.<ref>.supabase.co`) is IPv6-only and GitHub's
  runners are IPv4. It fails as "Network is unreachable".
- Port **6543** is the transaction pooler, the one the app uses. It breaks
  `pg_dump`'s COPY protocol.

The pooler username looks like `postgres.<project-ref>`, not `postgres`.

### 4. The passphrase

Invent a long one for `BACKUP_PASSPHRASE`. **Store it somewhere other than
GitHub** — a password manager, written down, anywhere. If you lose both GitHub
and this passphrase, the dumps are noise. The photos are not encrypted, so they
survive losing it; everything written in the diary does not.

### 5. The secrets

Under **Settings → Secrets and variables → Actions**:

```
SUPABASE_DB_URL                 BACKUP_PASSPHRASE
SUPABASE_S3_ENDPOINT            R2_ENDPOINT
SUPABASE_S3_REGION              R2_ACCESS_KEY_ID
SUPABASE_S3_ACCESS_KEY_ID       R2_SECRET_ACCESS_KEY
SUPABASE_S3_SECRET_ACCESS_KEY   R2_BUCKET
```

`R2_ENDPOINT` is the host from step 1.2 — no bucket name on the end.

Then run it by hand once — **Actions → Backup → Run workflow** — rather than
assuming it works and finding out in a week. The last step prints what landed.

## Restoring

### Getting a dump open

```bash
rclone copy r2:memory-holder-backup/db/db-2026-11-16.tar.gz.gpg .
gpg --decrypt db-2026-11-16.tar.gz.gpg > db.tar.gz
tar xzf db.tar.gz          # public.sql, auth-users.sql
```

### One thing was deleted by accident

The common case, and the easy one. Load `public.sql` into a scratch Postgres
locally, find the rows, and copy them back by hand. The photos are still in R2
under `media/` at their original paths, so re-uploading one is a matter of
putting the file back where its row expects it.

### The project is gone

Longer, and worth reading **before** you need it.

1. Create a Supabase project and run migrations `0001`–`0005` in order. That
   rebuilds the tables, the policies, the storage bucket and the triggers.
2. `rclone sync r2:memory-holder-backup/media supabase:media` — the photos go
   back under the same paths, so every `media` row still points at its file.
3. Load the rows from `public.sql`. Skip the `CREATE TABLE` statements, since
   step 1 already made them; what you want are the `COPY` blocks.
4. **The accounts do not come back.** They live in the `auth` schema, which is
   Supabase's, not ours. Everyone signs up again and gets a **new id**, which
   means `profiles`, `couple_members` and `memories.created_by` all point at
   people who no longer exist.

   This is what `auth-users.sql` is for: it maps the old ids to email
   addresses. With a handful of people, the repair is a handful of `update`
   statements — one per person, swapping the old id for the new. Tedious, not
   hard. With hundreds it would be a project.

### The point of all this

**Do the restore once, now, while nothing is wrong.** Make a throwaway Supabase
project, run through "the project is gone" end to end, and see the diary come
up against it. Until you have done that, you have a workflow that uploads
files, not a backup.

That throwaway project is also the separate test database worth having anyway,
so the hour buys two things.

## When it fails

GitHub emails the repository owner when a scheduled workflow fails, which is
the only reason this is a workflow rather than a script on a laptop. Failures
worth recognising:

- **"Network is unreachable"** with an IPv6 address — wrong connection string,
  see step 3.
- **`server version mismatch`** — Supabase upgraded Postgres past the client
  doing the dump. Bump the `postgres:17-alpine` tag in the dump step; a newer
  client reads an older server fine, never the other way round.
- **An `apt` or mirror error** — nothing here uses apt, on purpose, after the
  runner's Ubuntu mirrors failed to resolve on the very first run. If one
  reappears, something was added that shouldn't have been.
- **The dump is only N bytes** — the dump ran and came back nearly empty. The
  job stops instead of overwriting a good backup with an empty one.
