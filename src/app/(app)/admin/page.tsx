import { getTranslations } from "next-intl/server";
import { requireCoupleContext } from "@/lib/data/couple-context";
import { getAllMemoriesForAdmin, getCategories, getDiaryMemberCount } from "@/lib/data/memories";
import { AdminTabs } from "./admin-tabs";
import { PageHeading } from "@/components/page-heading";

export default async function AdminPage() {
  const context = await requireCoupleContext();
  const [memories, categories, memberCount] = await Promise.all([
    getAllMemoriesForAdmin(context.couple.id),
    getCategories(context.couple.id),
    getDiaryMemberCount(context.couple.id),
  ]);
  const t = await getTranslations("Admin");

  return (
    <div>
      <PageHeading eyebrow={t("eyebrow")} title={t("heading")} />
      <div className="mt-9">
        <AdminTabs
          coupleId={context.couple.id}
          userId={context.userId}
          displayName={context.displayName}
          inviteCode={context.couple.invite_code}
          diaryName={context.couple.name}
          memberCount={memberCount}
          memories={memories}
          categories={categories}
        />
      </div>
    </div>
  );
}
