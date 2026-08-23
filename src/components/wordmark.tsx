export function Wordmark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const scale = {
    sm: "text-base",
    md: "text-2xl",
    lg: "text-4xl sm:text-5xl",
  }[size];

  return (
    <p className={`font-marker leading-none tracking-tight ${scale}`}>
      memory <span className="text-accent-1">holder</span>
    </p>
  );
}
