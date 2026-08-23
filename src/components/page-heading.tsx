import type { ReactNode } from "react";

/** Eyebrow + hand-lettered title, shared by every screen inside the app. */
export function PageHeading({
  eyebrow,
  title,
  hint,
  children,
}: {
  eyebrow: string;
  title: string;
  hint?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="font-mono text-[0.68rem] uppercase tracking-[0.22em] text-muted">{eyebrow}</p>
        <h1 className="mt-1.5 font-display text-3xl font-bold leading-none">{title}</h1>
        {hint && <p className="mt-2 text-sm text-ink-soft">{hint}</p>}
      </div>
      {children}
    </div>
  );
}
