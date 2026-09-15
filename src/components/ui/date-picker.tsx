"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useDismiss } from "@/lib/use-dismiss";

interface Ymd {
  year: number;
  /** 0–11, as in Date. */
  month: number;
  day: number;
}

// Dates are handled as plain calendar parts, never as instants: turning a
// YYYY-MM-DD into a Date at UTC midnight shows the previous day to anyone
// west of Greenwich (see formatDate in lib/format.ts for the same problem).
// The helpers below live outside the component so rendering stays free of
// calls like new Date() that React's purity lint rightly objects to.

function parse(value: string): Ymd | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? { year: +match[1], month: +match[2] - 1, day: +match[3] } : null;
}

function serialize({ year, month, day }: Ymd) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function today(): Ymd {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
}

function toDate({ year, month, day }: Ymd) {
  return new Date(year, month, day);
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

/** English calendars start on Sunday; Spanish and Chinese ones on Monday. */
function weekStartFor(locale: string) {
  return locale.startsWith("en") ? 0 : 1;
}

function weekdayNames(locale: string, weekStart: number) {
  const format = new Intl.DateTimeFormat(locale, { weekday: "narrow" });
  // 7 January 2024 was a Sunday.
  return Array.from({ length: 7 }, (_, i) => format.format(new Date(2024, 0, 7 + weekStart + i)));
}

function monthGrid(year: number, month: number, weekStart: number) {
  const lead = (new Date(year, month, 1).getDay() - weekStart + 7) % 7;
  return [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: daysInMonth(year, month) }, (_, i) => i + 1),
  ];
}

function addMonths(year: number, month: number, step: number) {
  const total = year * 12 + month + step;
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
}

/**
 * A date field in the app's own style, in place of <input type="date">,
 * whose calendar is drawn by the browser and looks different on every one.
 *
 * Opens on a month of days; the month title switches to a year of months, so
 * a memory from years back is a few clicks away rather than dozens.
 */
export function DatePicker({
  label,
  name,
  defaultValue = "",
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations("DatePicker");
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"days" | "months">("days");
  const [shown, setShown] = useState(() => {
    const start = parse(defaultValue);
    return start ? { year: start.year, month: start.month } : { year: 2000, month: 0 };
  });
  const [now, setNow] = useState<Ymd | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const labelId = useId();
  const triggerId = useId();

  const selected = parse(value);
  const weekStart = weekStartFor(locale);

  useDismiss(open, rootRef, () => setOpen(false));

  useEffect(() => {
    if (!open) return;
    const target =
      panelRef.current?.querySelector<HTMLElement>('[aria-pressed="true"]') ??
      panelRef.current?.querySelector<HTMLElement>('[aria-current="date"]') ??
      panelRef.current?.querySelector<HTMLElement>("button");
    // Runs only on opening: moving between months shouldn't pull focus around.
    target?.focus();
  }, [open]);

  function openPanel() {
    const current = today();
    setNow(current);
    // Opens on the chosen date's month, or this month for an empty field.
    const start = parse(value) ?? current;
    setShown({ year: start.year, month: start.month });
    setView("days");
    setOpen(true);
  }

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function pick(date: Ymd) {
    setValue(serialize(date));
    close();
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape" && open) {
      e.preventDefault();
      close();
    }
  }

  const monthTitle = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(
    toDate({ ...shown, day: 1 }),
  );
  const shortMonth = new Intl.DateTimeFormat(locale, { month: "short" });
  const fullDate = new Intl.DateTimeFormat(locale, { dateStyle: "full" });

  return (
    <div ref={rootRef} onKeyDown={onKeyDown} className="relative flex flex-col gap-1.5 text-sm">
      <span id={labelId} className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">
        {label}
      </span>

      {/* Carries the value into the form and keeps `required` working: a
          hidden input can't be validated, so this one is only invisible.
          The browser's "fill this in" bubble then points at the field. */}
      <input
        name={name}
        value={value}
        required={required}
        onChange={() => {}}
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 h-px w-full opacity-0"
      />

      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        onClick={() => (open ? close() : openPanel())}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-labelledby={`${labelId} ${triggerId}`}
        className="flex items-center justify-between gap-2 border-b-2 border-line bg-transparent px-1 py-2 text-left text-base outline-none focus-visible:border-ink sm:text-sm"
      >
        <span className={`truncate ${selected ? "text-ink" : "text-muted"}`}>
          {selected
            ? new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(toDate(selected))
            : t("placeholder")}
        </span>
        <span aria-hidden className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-labelledby={labelId}
          // Never wider than the screen: on a phone the field starts about
          // 50px in, and the panel is anchored to its left edge.
          className="sketch-soft absolute left-0 top-full z-30 mt-2 w-[18.5rem] max-w-[calc(100vw-4rem)] bg-surface p-3"
          style={{ rotate: "-0.3deg" }}
        >
          <div className="mb-2 flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={() =>
                setShown((s) => (view === "days" ? addMonths(s.year, s.month, -1) : { ...s, year: s.year - 1 }))
              }
              aria-label={view === "days" ? t("previousMonth") : t("previousYear")}
              className="btn-circle h-9 w-9 shrink-0"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => setView((v) => (v === "days" ? "months" : "days"))}
              aria-label={view === "days" ? t("chooseMonth") : undefined}
              className="min-w-0 truncate px-2 py-1 font-display text-xl font-bold leading-none first-letter:uppercase hover:-rotate-1"
            >
              {view === "days" ? monthTitle : shown.year}
            </button>
            <button
              type="button"
              onClick={() =>
                setShown((s) => (view === "days" ? addMonths(s.year, s.month, 1) : { ...s, year: s.year + 1 }))
              }
              aria-label={view === "days" ? t("nextMonth") : t("nextYear")}
              className="btn-circle h-9 w-9 shrink-0"
            >
              ›
            </button>
          </div>

          {view === "days" ? (
            <>
              <div className="grid grid-cols-7 gap-0.5" aria-hidden>
                {weekdayNames(locale, weekStart).map((day, i) => (
                  <span
                    key={i}
                    className="py-1 text-center font-mono text-[0.6rem] uppercase tracking-[0.1em] text-muted"
                  >
                    {day}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {monthGrid(shown.year, shown.month, weekStart).map((day, i) => {
                  if (day === null) return <span key={`blank-${i}`} />;
                  const date = { ...shown, day };
                  const isSelected =
                    selected?.year === date.year && selected.month === date.month && selected.day === day;
                  const isToday = now?.year === date.year && now.month === date.month && now.day === day;
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => pick(date)}
                      aria-label={fullDate.format(toDate(date))}
                      aria-pressed={isSelected}
                      aria-current={isToday ? "date" : undefined}
                      className={`grid aspect-square w-full place-items-center rounded-full text-sm tabular-nums outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ink ${
                        isSelected
                          ? "bg-ink font-bold text-ground"
                          : isToday
                            ? "font-bold text-accent-1 underline decoration-2 underline-offset-4 hover:bg-ground-2"
                            : "text-ink hover:bg-ground-2"
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {Array.from({ length: 12 }, (_, month) => {
                const current = month === shown.month;
                return (
                  <button
                    key={month}
                    type="button"
                    onClick={() => {
                      setShown((s) => ({ ...s, month }));
                      setView("days");
                    }}
                    aria-pressed={current}
                    className={`px-1 py-2.5 font-display text-lg leading-none outline-none transition-transform first-letter:uppercase hover:-rotate-1 focus-visible:-rotate-1 ${
                      current ? "highlighted font-bold text-ink" : "text-ink-soft hover:text-ink focus-visible:text-ink"
                    }`}
                  >
                    {shortMonth.format(new Date(2024, month, 1)).replace(".", "")}
                  </button>
                );
              })}
            </div>
          )}

          <div className="drawn-rule mt-3 h-2 w-full" aria-hidden />
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => pick(today())}
              className="px-1 py-1 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted hover:text-accent-1"
            >
              {t("today")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
