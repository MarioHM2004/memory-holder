import type { ReactNode } from "react";
import { requireCoupleContext } from "@/lib/data/couple-context";
import { RailNav } from "@/components/rail-nav";
import { BottomNav } from "@/components/bottom-nav";
import { ServiceWorker } from "@/components/service-worker";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const context = await requireCoupleContext();

  return (
    // Stacked on a phone, side by side from lg up. A 216px rail beside the
    // panel leaves about 80px of content on a 375px screen, so below lg the
    // rail shrinks to a one-line header and the links move to BottomNav.
    // pb-24 is the room that fixed bar needs; without it the last row of
    // every page hides underneath it.
    <div className="mx-auto flex max-w-350 flex-col gap-4 px-3 pb-24 pt-4 sm:px-6 sm:pt-8 lg:flex-row lg:items-start lg:gap-7 lg:pb-8">
      <RailNav diaries={context.diaries} activeDiaryId={context.couple.id} />
      {/* flex-col so a screen can hand a child flex-1 and have it fill the
          panel — the timeline centres its line that way. */}
      <main className="sketch-2 flex min-h-[70vh] min-w-0 flex-1 flex-col bg-surface p-4 sm:p-6 lg:p-9">
        {children}
      </main>
      <BottomNav />
      <ServiceWorker />
    </div>
  );
}
