import { getTranslations } from "next-intl/server";
import { requireCoupleContext } from "@/lib/data/couple-context";
import { getRuletaMemories } from "@/lib/data/memories";
import { RouletteWheel } from "@/components/roulette-wheel";
import { PageHeading } from "@/components/page-heading";

export default async function RoulettePage() {
  const context = await requireCoupleContext();
  const memories = await getRuletaMemories(context.couple.id);
  const t = await getTranslations("Roulette");

  return (
    <div>
      <PageHeading eyebrow={t("eyebrow")} title={t("heading")} />
      <div className="mt-10">
        <RouletteWheel memories={memories} />
      </div>
    </div>
  );
}
