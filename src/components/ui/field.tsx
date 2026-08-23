export function Field({
  label,
  name,
  type = "text",
  required,
  minLength,
  maxLength,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">
        {label}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        minLength={minLength}
        maxLength={maxLength}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="border-b-2 border-line bg-transparent px-1 py-2 text-ink outline-none placeholder:text-muted focus:border-ink"
      />
    </label>
  );
}
