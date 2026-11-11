import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { requireCoupleContext } from "@/lib/data/couple-context";
import { searchMemories } from "@/lib/data/memories";
import { formatDate } from "@/lib/format";
import { mediaUrl } from "@/lib/media-url";
import { PageHeading } from "@/components/page-heading";

/**
 * Searching the whole diary.
 *
 * A plain GET form, so the query lives in the URL: the results can be
 * reloaded, shared between the two of you, and kept in history, and the page
 * needs no JavaScript at all to work.
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const context = await requireCoupleContext();
  const t = await getTranslations("Search");
  const locale = await getLocale();

  const query = ((await searchParams).q ?? "").trim();
  const results = query ? await searchMemories(context.couple.id, query) : [];

  return (
    <div>
      <PageHeading eyebrow={t("eyebrow")} title={t("heading")} />

      <form method="get" className="mt-7 flex flex-wrap items-center gap-3">
        <label className="sketch-soft-2 flex min-w-0 flex-1 items-center gap-2 bg-surface px-4 py-2">
          <span aria-hidden className="text-muted">
            ⌕
          </span>
          <span className="sr-only">{t("heading")}</span>
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder={t("placeholder")}
            autoFocus
            className="w-full min-w-0 bg-transparent outline-none placeholder:text-muted"
          />
        </label>
        <button type="submit" className="btn-ink">
          {t("submit")}
        </button>
      </form>

      {!query ? (
        <p className="mt-10 text-center text-ink-soft">{t("prompt")}</p>
      ) : results.length === 0 ? (
        <p className="sketch-soft mt-8 bg-surface-2 p-8 text-center text-ink-soft">
          {t("noResults", { query })}
        </p>
      ) : (
        <>
          <p className="mt-6 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">
            {results.length === 1 ? t("countOne") : t("countOther", { count: results.length })}
          </p>

          <ul className="mt-4 divide-y divide-line">
            {results.map((memory) => (
              <li key={memory.id}>
                <Link
                  href={`/memories/${memory.id}`}
                  className="flex items-start gap-4 py-4 transition-transform hover:translate-x-0.5"
                >
                  {memory.coverMediaId ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={mediaUrl(memory.coverMediaId, "thumb")}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-16 w-16 shrink-0 border border-ink/25 object-cover sm:h-20 sm:w-20"
                    />
                  ) : (
                    <span
                      aria-hidden
                      className="h-16 w-16 shrink-0 border border-dashed border-line sm:h-20 sm:w-20"
                    />
                  )}

                  <div className="min-w-0">
                    <p className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted">
                      {formatDate(memory.memory_date, locale)}
                      {memory.categories && ` · ${memory.categories.name}`}
                    </p>
                    <h2 className="mt-1 font-display text-xl font-bold leading-tight">
                      {memory.title}
                    </h2>
                    {memory.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-ink-soft">
                        {memory.description}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {/* The query is capped in searchMemories; say so rather than let
              someone assume a short list is the whole truth. */}
          {results.length >= 50 && (
            <p className="mt-6 text-center text-sm text-muted">{t("truncated")}</p>
          )}
        </>
      )}
    </div>
  );
}
