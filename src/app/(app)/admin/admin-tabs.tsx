"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MemoriesPanel } from "./memories-panel";
import { CategoriesPanel } from "./categories-panel";
import { InvitePanel } from "./invite-panel";
import { AccountPanel } from "./account-panel";
import { LeaveDiary } from "./leave-diary";
import type { CategoryWithCount, MemoryForAdmin } from "@/lib/data/memories";

type Tab = "memories" | "categories" | "invite" | "account";

export function AdminTabs({
  coupleId,
  userId,
  email,
  displayName,
  inviteCode,
  diaryName,
  memberCount,
  memories,
  categories,
}: {
  coupleId: string;
  userId: string;
  email: string;
  displayName: string;
  inviteCode: string;
  diaryName: string;
  memberCount: number;
  memories: MemoryForAdmin[];
  categories: CategoryWithCount[];
}) {
  const t = useTranslations("Admin.tabs");
  const [tab, setTab] = useState<Tab>("memories");

  const tabs: { id: Tab; label: string }[] = [
    { id: "memories", label: t("memories") },
    { id: "categories", label: t("categories") },
    { id: "invite", label: t("invite") },
    { id: "account", label: t("account") },
  ];

  return (
    <div>
      <div className="mb-8 flex w-fit flex-wrap gap-3">
        {tabs.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            aria-pressed={tab === item.id}
            className={`px-4 py-2 font-display text-lg font-bold leading-none transition-transform hover:-translate-y-0.5 ${
              tab === item.id
                ? "sketch bg-ink text-ground"
                : "sketch-soft-2 text-ink-soft hover:text-ink"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "memories" && (
        <MemoriesPanel
          coupleId={coupleId}
          userId={userId}
          displayName={displayName}
          memories={memories}
          categories={categories}
        />
      )}
      {tab === "categories" && <CategoriesPanel coupleId={coupleId} categories={categories} />}
      {tab === "account" && <AccountPanel email={email} />}
      {/* The tab is labelled "Diary": inviting people in and leaving it.
          Side by side once there's room, stacked on a phone. */}
      {tab === "invite" && (
        <div className="flex flex-col gap-6 md:flex-row md:items-start">
          <InvitePanel inviteCode={inviteCode} />
          <LeaveDiary coupleId={coupleId} diaryName={diaryName} memberCount={memberCount} />
        </div>
      )}
    </div>
  );
}
