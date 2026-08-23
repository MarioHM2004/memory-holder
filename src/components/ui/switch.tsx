export function Switch({
  name,
  defaultChecked,
  label,
  hint,
}: {
  name: string;
  defaultChecked?: boolean;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm">
      <span className="relative inline-flex h-[24px] w-[42px] shrink-0 items-center rounded-full border-2 border-ink bg-transparent has-checked:bg-accent-3">
        <input type="checkbox" name={name} defaultChecked={defaultChecked} className="peer sr-only" />
        <span className="absolute left-[2px] h-4 w-4 rounded-full border-2 border-ink bg-surface transition-transform peer-checked:translate-x-[18px]" />
      </span>
      <span className="flex flex-col">
        <span className="font-semibold text-ink">{label}</span>
        {hint && <span className="text-xs text-muted">{hint}</span>}
      </span>
    </label>
  );
}
