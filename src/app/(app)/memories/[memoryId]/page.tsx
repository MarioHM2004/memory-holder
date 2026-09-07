import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requireCoupleContext } from "@/lib/data/couple-context";
import { getMemory } from "@/lib/data/memories";
import { formatDate } from "@/lib/format";
import { MemoryGallery } from "@/components/memory-gallery";
import { BackButton } from "@/components/back-button";

export default async function MemoryPage({ params }: { params: Promise<{ memoryId: string }> }) {
  const { memoryId } = await params;
  const context = await requireCoupleContext();
  const result = await getMemory(context.couple.id, memoryId);
  if (!result) notFound();

  const { memory, media } = result;
  const t = await getTranslations("Memory");
  const locale = await getLocale();

  return (
    <div>
      <div className="mb-8 flex items-start gap-4">
        <BackButton />
        <div>
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-muted">
            {memory.categories?.name ?? t("noCategory")}
          </p>
          <h1 className="mt-1 font-marker text-2xl leading-tight sm:text-3xl">{memory.title}</h1>
        </div>
      </div>

      <MemoryGallery media={media} />

      <div className="mt-8">
        <p className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-accent-1">
          {formatDate(memory.memory_date, locale)}
        </p>
        <p className="mt-2.5 max-w-[60ch] text-ink-soft">{memory.description}</p>
      </div>

      {/* The long-form entry, only ever shown here. whitespace-pre-line keeps
          the paragraph breaks someone typed without needing a rich editor. */}
      {memory.body && (
        <div className="mt-10 border-t-2 border-line pt-8">
          <h2 className="font-display text-2xl font-bold leading-none">{t("entryHeading")}</h2>
          <div className="mt-4 max-w-[65ch] whitespace-pre-line leading-relaxed text-ink">
            {memory.body}
          </div>
        </div>
      )}
    </div>
  );
}
