"use client";

import { useEffect, useRef, useState, useTransition, type KeyboardEvent } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { switchDiaryAction } from "@/app/(app)/actions";
import type { DiarySummary } from "@/lib/data/couple-context";
import { useDismiss } from "@/lib/use-dismiss";

/**
 * The current diary's name, opening a menu of the user's diaries plus the way
 * to create or join another.
 *
 * Built by hand rather than with a <select>: the native control's box and
 * option list are drawn by the OS and can't take the sketched borders and
 * handwritten type the rest of the rail uses.
 */
export function DiarySwitcher({ diaries, activeId }: { diaries: DiarySummary[]; activeId: string }) {
  const t = useTranslations("Nav");
  const [open, setOpen] = useState(false);
  const [switching, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const active = diaries.find((diary) => diary.id === activeId);

  useDismiss(open, rootRef, () => setOpen(false));

  // Focus lands on the current diary, so arrow keys start from there.
  useEffect(() => {
    if (open) menuRef.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus();
  }, [open]);

  function choose(id: string) {
    setOpen(false);
    if (id === activeId) return;
    startTransition(() => switchDiaryAction(id));
  }

  function onMenuKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>("[role^=menuitem]") ?? []);
    const index = items.indexOf(document.activeElement as HTMLElement);
    const next = (index + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
    items[next]?.focus();
  }

  return (
    <div ref={rootRef} className="relative min-w-0 lg:mb-4 lg:pt-1">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={switching}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${t("diary")}: ${active?.name ?? ""}`}
        className="flex min-w-0 max-w-[50vw] items-center gap-1.5 px-1 py-1 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-muted hover:text-ink disabled:opacity-50 lg:max-w-[176px]"
      >
        <span className="truncate">{active?.name}</span>
        <span
          aria-hidden
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={t("diary")}
          onKeyDown={onMenuKeyDown}
          // Right-aligned on the phone bar, where the name sits at the right
          // edge and a left-aligned menu would run off the screen.
          className="sketch-soft absolute right-0 top-full z-30 mt-2 flex w-60 flex-col gap-0.5 bg-surface p-3 lg:left-0 lg:right-auto"
          style={{ rotate: "-0.4deg" }}
        >
          {diaries.map((diary) => {
            const current = diary.id === activeId;
            return (
              <button
                key={diary.id}
                type="button"
                role="menuitemradio"
                aria-checked={current}
                onClick={() => choose(diary.id)}
                className={`w-fit max-w-full truncate px-1 py-1.5 text-left font-display text-lg leading-tight outline-none transition-transform hover:translate-x-0.5 focus-visible:translate-x-0.5 focus-visible:text-ink ${
                  current ? "highlighted font-bold text-ink" : "text-ink-soft hover:text-ink"
                }`}
              >
                {diary.name}
              </button>
            );
          })}

          <div className="drawn-rule my-2 h-2 w-full" aria-hidden />

          <Link
            href="/onboarding"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="px-1 py-1 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted outline-none hover:text-accent-1 focus-visible:text-accent-1"
          >
            + {t("newDiary")}
          </Link>
        </div>
      )}
    </div>
  );
}
