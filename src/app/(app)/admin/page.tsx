import { getTranslations } from "next-intl/server";
import { requireCoupleContext } from "@/lib/data/couple-context";
import { getAllMemoriesForAdmin, getCategories, getDiaryMemberCount } from "@/lib/data/memories";
import { createClient } from "@/lib/supabase/server";
import { AdminTabs } from "./admin-tabs";
import { PageHeading } from "@/components/page-heading";

export default async function AdminPage() {
  const context = await requireCoupleContext();
  const supabase = await createClient();
  const [memories, categories, memberCount, { data: profile }] = await Promise.all([
    getAllMemoriesForAdmin(context.couple.id),
    getCategories(context.couple.id),
    getDiaryMemberCount(context.couple.id),
    supabase.from("profiles").select("weekly_email").eq("id", context.userId).single(),
  ]);
  const t = await getTranslations("Admin");

  return (
    <div>
      <PageHeading eyebrow={t("eyebrow")} title={t("heading")} />
      <div className="mt-9">
        <AdminTabs
          coupleId={context.couple.id}
          userId={context.userId}
          email={context.email}
          weeklyEmail={profile?.weekly_email ?? true}
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
