import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireCoupleContext } from "@/lib/data/couple-context";
import { getCategories, getUncategorizedCount } from "@/lib/data/memories";
import { PageHeading } from "@/components/page-heading";

const SKETCHES = ["sketch", "sketch-2", "sketch-3"];
const TILTS = [-0.8, 0.6, -0.4, 0.9, -0.6, 0.5];

export default async function CategoriesPage() {
  const context = await requireCoupleContext();
  const [categories, uncategorizedCount] = await Promise.all([
    getCategories(context.couple.id),
    getUncategorizedCount(context.couple.id),
  ]);
  const t = await getTranslations("Categories");
  const tCommon = await getTranslations("Common");

  return (
    <div>
      <PageHeading eyebrow={t("eyebrow")} title={t("heading")} />

      {categories.length === 0 && uncategorizedCount === 0 ? (
        <div className="sketch-soft mt-8 bg-surface-2 p-10 text-center text-ink-soft">
          <p>{t("empty")}</p>
          <Link
            href="/admin"
            className="mt-4 inline-block font-display text-lg font-bold text-ink underline decoration-accent-1 decoration-2 underline-offset-4"
          >
            {tCommon("goToAdmin")}
          </Link>
        </div>
      ) : (
        <div className="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category, i) => (
            <Link
              key={category.id}
              href={`/categories/${category.id}`}
              style={{ rotate: `${TILTS[i % TILTS.length]}deg` }}
              className={`${SKETCHES[i % SKETCHES.length]} bg-surface p-6 transition-transform hover:-translate-y-1 hover:rotate-0`}
            >
              <span
                className="mb-4 block h-10 w-10 rounded-full border-2 border-ink"
                style={{ background: category.color }}
                aria-hidden
              />
              <h3 className="font-display text-2xl font-bold leading-none">{category.name}</h3>
              <span className="mt-1.5 block font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">
                {category.memoryCount === 1
                  ? t("memoryCountOne", { count: category.memoryCount })
                  : t("memoryCountOther", { count: category.memoryCount })}
              </span>
            </Link>
          ))}

          {/* Not a real category row — a folder for memories saved without
              one, so they stay reachable from here. */}
          {uncategorizedCount > 0 && (
            <Link
              href="/categories/uncategorized"
              style={{ rotate: `${TILTS[categories.length % TILTS.length]}deg` }}
              className={`${SKETCHES[categories.length % SKETCHES.length]} border-dashed bg-surface p-6 transition-transform hover:-translate-y-1 hover:rotate-0`}
            >
              <span
                className="mb-4 block h-10 w-10 rounded-full border-2 border-dashed border-ink"
                aria-hidden
              />
              <h3 className="font-display text-2xl font-bold leading-none">{t("uncategorized")}</h3>
              <span className="mt-1.5 block font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">
                {uncategorizedCount === 1
                  ? t("memoryCountOne", { count: uncategorizedCount })
                  : t("memoryCountOther", { count: uncategorizedCount })}
              </span>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
