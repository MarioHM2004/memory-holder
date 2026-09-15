import type { ReactNode } from "react";
import { requireCoupleContext } from "@/lib/data/couple-context";
import { RailNav } from "@/components/rail-nav";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const context = await requireCoupleContext();

  return (
    // Stacked on a phone, side by side from lg up. A 216px rail beside the
    // panel leaves about 80px of content on a 375px screen, so below lg the
    // nav becomes a bar above the page instead of a column next to it.
    <div className="mx-auto flex max-w-350 flex-col gap-4 px-3 py-4 sm:px-6 sm:py-8 lg:flex-row lg:items-start lg:gap-7">
      <RailNav diaries={context.diaries} activeDiaryId={context.couple.id} />
      {/* flex-col so a screen can hand a child flex-1 and have it fill the
          panel — the timeline centres its line that way. */}
      <main className="sketch-2 flex min-h-[70vh] min-w-0 flex-1 flex-col bg-surface p-4 sm:p-6 lg:p-9">
        {children}
      </main>
    </div>
  );
}
