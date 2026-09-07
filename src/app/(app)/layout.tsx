import type { ReactNode } from "react";
import { requireCoupleContext } from "@/lib/data/couple-context";
import { RailNav } from "@/components/rail-nav";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const context = await requireCoupleContext();

  return (
    <div className="mx-auto flex max-w-350 items-start gap-7 px-6 py-8">
      <RailNav coupleName={context.couple.name} />
      {/* flex-col so a screen can hand a child flex-1 and have it fill the
          panel — the timeline centres its line that way. */}
      <main className="sketch-2 flex min-h-[70vh] min-w-0 flex-1 flex-col bg-surface p-9">
        {children}
      </main>
    </div>
  );
}
