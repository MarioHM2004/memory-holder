"use client";

import { useOptimistic, useTransition } from "react";
import { useTranslations } from "next-intl";
import { setWeeklyEmailAction } from "./actions";

/**
 * Turns the Sunday email on and off. Saves on the flick rather than behind a
 * button: there is one setting here and nothing to review before applying it.
 *
 * The switch moves immediately and is reconciled when the write comes back,
 * so it doesn't sit still for a round trip and look broken.
 */
export function WeeklyEmailToggle({ enabled }: { enabled: boolean }) {
  const t = useTranslations("Admin.account");
  const [pending, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic(enabled);

  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm">
      <span className="relative inline-flex h-[24px] w-[42px] shrink-0 items-center rounded-full border-2 border-ink bg-transparent has-checked:bg-accent-3">
        <input
          type="checkbox"
          checked={shown}
          disabled={pending}
          onChange={(e) => {
            const next = e.target.checked;
            startTransition(async () => {
              setShown(next);
              await setWeeklyEmailAction(next);
            });
          }}
          className="peer sr-only"
        />
        <span className="absolute left-[2px] h-4 w-4 rounded-full border-2 border-ink bg-surface transition-transform peer-checked:translate-x-[18px]" />
      </span>
      <span className="flex flex-col">
        <span className="font-semibold text-ink">{t("weeklyLabel")}</span>
        <span className="text-xs text-muted">{t("weeklyHint")}</span>
      </span>
    </label>
  );
}
