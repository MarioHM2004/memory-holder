import { getTranslations } from "next-intl/server";
import { requireCoupleContext } from "@/lib/data/couple-context";
import { getTimelineMemories } from "@/lib/data/memories";
import { Timeline } from "@/components/timeline";
import { PageHeading } from "@/components/page-heading";

export default async function TimelinePage() {
  const context = await requireCoupleContext();
  const memories = await getTimelineMemories(context.couple.id);
  const t = await getTranslations("Timeline");

  return (
    <div className="flex flex-1 flex-col">
      <PageHeading eyebrow={t("eyebrow")} title={t("heading")} hint={t("hint")} />
      {/* Fills whatever height is left under the heading and sits the line in
          the middle of it, rather than leaving it stranded near the top. */}
      <div className="flex flex-1 items-center">
        <Timeline memories={memories} />
      </div>
    </div>
  );
}
