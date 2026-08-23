import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireCoupleContext } from "@/lib/data/couple-context";
import {
  getCategory,
  getCategoryMemories,
  getUncategorizedMemories,
} from "@/lib/data/memories";
import { BubbleCanvas } from "@/components/bubble-canvas";

// Stands in for a category id in the URL. Safe against collisions: real ids
// are UUIDs.
const UNCATEGORIZED = "uncategorized";

export default async function CategoryDetailPage({
  params,
}: {
  params: Promise<{ categoryId: string }>;
}) {
  const { categoryId } = await params;
  const context = await requireCoupleContext();
  const t = await getTranslations("CategoryDetail");

  let title: string;
  let memories;

  if (categoryId === UNCATEGORIZED) {
    const tCategories = await getTranslations("Categories");
    title = tCategories("uncategorized");
    memories = await getUncategorizedMemories(context.couple.id);
  } else {
    const category = await getCategory(context.couple.id, categoryId);
    if (!category) notFound();
    title = category.name;
    memories = await getCategoryMemories(context.couple.id, categoryId);
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-7 flex items-center gap-4">
        <Link href="/categories" aria-label={t("backLabel")} className="btn-circle h-10 w-10 text-lg">
          ←
        </Link>
        <div>
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-muted">
            {t("eyebrow")}
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold leading-none">{title}</h1>
        </div>
      </div>
      <BubbleCanvas memories={memories} />
    </div>
  );
}
