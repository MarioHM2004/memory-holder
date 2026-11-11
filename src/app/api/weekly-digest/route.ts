import { timingSafeEqual } from "node:crypto";
import { getTranslations } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isLocale, defaultLocale } from "@/i18n/locales";
import { formatDate } from "@/lib/format";
import { SITE_URL } from "@/lib/site";
import { renderWeeklyEmail } from "@/lib/weekly-email";

/**
 * Sends everyone one of their own memories, once a week. Driven by
 * .github/workflows/weekly-email.yml, because a cron that costs nothing is
 * the only kind this project runs.
 *
 * Nobody is signed in when this runs, so it reads across every diary with the
 * service role key — see lib/supabase/admin.ts for what that means. The
 * shared secret below is the only thing standing in front of it.
 */

/** Long enough that a link still works if someone opens Sunday's email on Friday. */
const PHOTO_URL_TTL = 60 * 60 * 24 * 8;

function authorised(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;

  const given = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  // Length has to match before the constant-time compare, and comparing the
  // lengths themselves leaks only how long the secret is.
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!authorised(request)) {
    return Response.json({ error: "unauthorised" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: recipients, error } = await supabase.rpc("weekly_digest");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!recipients?.length) return Response.json({ sent: 0, failed: 0, recipients: 0 });

  // One signing call for every photo rather than one per email.
  const paths = [...new Set(recipients.map((r) => r.cover_path).filter((p): p is string => !!p))];
  const signed = new Map<string, string>();
  if (paths.length > 0) {
    const { data } = await supabase.storage.from("media").createSignedUrls(paths, PHOTO_URL_TTL);
    for (const entry of data ?? []) {
      if (entry.path && entry.signedUrl) signed.set(entry.path, entry.signedUrl);
    }
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return Response.json({ error: "RESEND_API_KEY is not set" }, { status: 500 });

  let sent = 0;
  const failures: { email: string; reason: string }[] = [];

  for (const person of recipients) {
    const locale = isLocale(person.locale) ? person.locale : defaultLocale;
    const t = await getTranslations({ locale, namespace: "WeeklyEmail" });
    const unsubscribeUrl = `${SITE_URL}/unsubscribe/${person.unsubscribe_token}`;

    const html = renderWeeklyEmail({
      title: person.title,
      description: person.description,
      date: formatDate(person.memory_date, locale),
      photoUrl: person.cover_path ? (signed.get(person.cover_path) ?? null) : null,
      memoryUrl: `${SITE_URL}/memories/${person.memory_id}`,
      unsubscribeUrl,
      strings: {
        greeting: t("greeting", { name: person.display_name }),
        from: t("from", { diary: person.diary_name }),
        open: t("open"),
        why: t("why"),
        unsubscribe: t("unsubscribe"),
      },
    });

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Memory Holder <hola@memory-holder.com>",
          to: person.email,
          subject: t("subject", { title: person.title }),
          html,
          headers: {
            // Lets a mail client show its own unsubscribe button. The
            // one-click form posts to the API route, which exists precisely
            // so a scanner following the visible link can't unsubscribe
            // anyone by accident.
            "List-Unsubscribe": `<${SITE_URL}/api/unsubscribe/${person.unsubscribe_token}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        }),
      });

      if (!response.ok) throw new Error(`${response.status} ${(await response.text()).slice(0, 200)}`);
      sent++;
    } catch (err) {
      // One bad address mustn't stop the rest of the send.
      failures.push({
        email: person.email,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // 500 on any failure so the workflow goes red: an email nobody got and
  // nobody heard about is the same as not having the feature.
  return Response.json(
    { recipients: recipients.length, sent, failed: failures.length, failures },
    { status: failures.length > 0 ? 500 : 200 },
  );
}
