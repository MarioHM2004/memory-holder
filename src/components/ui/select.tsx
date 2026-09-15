"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useDismiss } from "@/lib/use-dismiss";

export interface SelectOption {
  value: string;
  label: string;
  /** A swatch beside the label. null draws an empty one, to line up with the rest. */
  color?: string | null;
}

/**
 * A dropdown in the app's own style, for use inside forms in place of
 * <select>, whose box and option list are drawn by the OS and can't take the
 * sketched borders or handwritten type.
 *
 * Submits through a hidden input named `name`, so it drops into a form like
 * the native control did.
 */
export function Select({
  label,
  name,
  options,
  defaultValue = "",
}: {
  label: string;
  name: string;
  options: SelectOption[];
  defaultValue?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const labelId = useId();
  const triggerId = useId();
  const selected = options.find((option) => option.value === value) ?? options[0];

  useDismiss(open, rootRef, () => setOpen(false));

  // Opening puts focus on the current choice, so the arrow keys start there.
  useEffect(() => {
    if (open) listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus();
  }, [open]);

  function pick(next: string) {
    setValue(next);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    if (!open) {
      setOpen(true);
      return;
    }
    const items = Array.from(listRef.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? []);
    const index = items.indexOf(document.activeElement as HTMLElement);
    items[(index + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
  }

  return (
    <div ref={rootRef} onKeyDown={onKeyDown} className="relative flex flex-col gap-1.5 text-sm">
      <span id={labelId} className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">
        {label}
      </span>
      <input type="hidden" name={name} value={value} />

      {/* text-base below sm matches the text inputs, which globals.css bumps
          to 16px on phones to stop iOS zooming into them. */}
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${labelId} ${triggerId}`}
        className="flex items-center justify-between gap-2 border-b-2 border-line bg-transparent px-1 py-2 text-left text-base text-ink outline-none focus-visible:border-ink sm:text-sm"
      >
        <span className="flex min-w-0 items-center gap-2">
          {selected?.color !== undefined && <Swatch color={selected.color} />}
          <span className="truncate">{selected?.label}</span>
        </span>
        <span aria-hidden className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>

      {open && (
        <div
          ref={listRef}
          role="listbox"
          aria-labelledby={labelId}
          className="sketch-soft absolute inset-x-0 top-full z-30 mt-2 flex max-h-64 flex-col gap-0.5 overflow-y-auto bg-surface p-2"
        >
          {options.map((option) => {
            const current = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={current}
                onClick={() => pick(option.value)}
                className={`flex w-full items-center gap-2.5 px-2 py-2 text-left font-display text-lg leading-tight outline-none transition-transform hover:translate-x-0.5 focus-visible:translate-x-0.5 ${
                  current ? "font-bold text-ink" : "text-ink-soft hover:text-ink focus-visible:text-ink"
                }`}
              >
                {option.color !== undefined && <Swatch color={option.color} />}
                <span className={`truncate ${current ? "highlighted" : ""}`}>{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Swatch({ color }: { color: string | null }) {
  return (
    <span
      aria-hidden
      className={`h-3 w-3 shrink-0 rounded-full border border-ink ${color ? "" : "border-dashed"}`}
      style={color ? { background: color } : undefined}
    />
  );
}
