"use client";

import { useEffect, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { locales, localeNames, type Locale } from "@/i18n/locales";
import { setLocaleAction } from "@/i18n/actions";
import { useDismiss } from "@/lib/use-dismiss";

/**
 * Picks the interface language.
 *
 * A menu rather than every language laid out in a row: three fitted, a fourth
 * or fifth would start wrapping under the theme button in the rail and in the
 * footer of every signed-out card.
 */
export function LanguageSwitcher({ showLabel = true }: { showLabel?: boolean } = {}) {
  const locale = useLocale();
  const t = useTranslations("Language");
  const [open, setOpen] = useState(false);
  // Which way the menu opens. It sits at the foot of a card on the
  // signed-out pages, where up is the only way it fits, but near the top of
  // the screen on the phone nav bar, where up would run off it.
  const [openUp, setOpenUp] = useState(true);
  const [switching, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useDismiss(open, rootRef, () => setOpen(false));

  function toggle() {
    const trigger = triggerRef.current;
    if (trigger && !open) {
      const { top, bottom } = trigger.getBoundingClientRect();
      setOpenUp(top > window.innerHeight - bottom);
    }
    setOpen((value) => !value);
  }

  // Focus starts on the current language, so the arrow keys move from there.
  useEffect(() => {
    if (open) menuRef.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus();
  }, [open]);

  function choose(next: Locale) {
    setOpen(false);
    triggerRef.current?.focus();
    if (next !== locale) startTransition(() => setLocaleAction(next));
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
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>("[role=menuitemradio]") ?? []);
    const index = items.indexOf(document.activeElement as HTMLElement);
    items[(index + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
  }

  return (
    <div ref={rootRef} className="relative flex flex-col gap-1.5">
      {/* The heading is dropped where the control sits in a crowded row —
          the phone header — but kept for screen readers either way. */}
      <span
        className={
          showLabel
            ? "px-1 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-muted"
            : "sr-only"
        }
      >
        {t("label")}
      </span>

      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        disabled={switching}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${t("label")}: ${localeNames[locale as Locale]}`}
        className="flex items-center gap-1.5 px-1 font-display text-base text-ink-soft hover:text-ink disabled:opacity-50"
      >
        <span className="highlighted font-bold text-ink">{localeNames[locale as Locale]}</span>
        <span aria-hidden className={`text-muted transition-transform ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={t("label")}
          onKeyDown={onMenuKeyDown}
          // Only as wide as the longest language name. Capped and scrollable
          // so a long list stays on screen whichever way it opens.
          // Anchored to its right edge on the phone header, where the
          // control sits near the end of the row and a left-anchored panel
          // would hang off it; from lg it's at the foot of the rail with
          // room to its right.
          className={`sketch-soft absolute right-0 z-30 flex max-h-[45vh] w-max min-w-[6.5rem] flex-col gap-0.5 overflow-y-auto bg-surface p-2 lg:left-0 lg:right-auto ${
            openUp ? "bottom-full mb-2" : "top-full mt-2"
          }`}
          style={{ rotate: "-0.4deg" }}
        >
          {locales.map((item: Locale) => {
            const current = item === locale;
            return (
              <button
                key={item}
                type="button"
                role="menuitemradio"
                aria-checked={current}
                onClick={() => choose(item)}
                className={`w-fit max-w-full truncate px-1.5 py-1 text-left font-display text-base leading-tight outline-none transition-transform hover:translate-x-0.5 focus-visible:translate-x-0.5 focus-visible:text-ink ${
                  current ? "highlighted font-bold text-ink" : "text-ink-soft hover:text-ink"
                }`}
              >
                {localeNames[item]}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
