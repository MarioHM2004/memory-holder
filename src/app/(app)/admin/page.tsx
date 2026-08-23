import { getTranslations } from "next-intl/server";
import { requireCoupleContext } from "@/lib/data/couple-context";
import { getAllMemoriesForAdmin, getCategories } from "@/lib/data/memories";
import { AdminTabs } from "./admin-tabs";
import { PageHeading } from "@/components/page-heading";

export default async function AdminPage() {
  const context = await requireCoupleContext();
  const [memories, categories] = await Promise.all([
    getAllMemoriesForAdmin(context.couple.id),
    getCategories(context.couple.id),
  ]);
  const t = await getTranslations("Admin");

  return (
    <div>
      <PageHeading eyebrow={t("eyebrow")} title={t("heading")} />
      <div className="mt-9">
        <AdminTabs
          coupleId={context.couple.id}
          inviteCode={context.couple.invite_code}
          memories={memories}
          categories={categories}
        />
      </div>
    </div>
  );
}
