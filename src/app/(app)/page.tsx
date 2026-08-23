import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireCoupleContext } from "@/lib/data/couple-context";
import { getRecentMemories } from "@/lib/data/memories";
import { formatDate } from "@/lib/format";

export default async function HomePage() {
  const context = await requireCoupleContext();
  const recent = await getRecentMemories(context.couple.id, 3);
  const t = await getTranslations("Home");

  return (
    <div>
      <div className="mx-auto max-w-2xl py-6 text-center">
        <p className="font-mono text-[0.68rem] uppercase tracking-[0.3em] text-muted">
          {context.couple.name}
        </p>
        <h1 className="mt-5 text-balance font-marker text-3xl leading-[1.25] sm:text-[2.6rem]">
          {t("heading")}
        </h1>
        <div className="drawn-rule mx-auto mt-6 h-2 w-40" aria-hidden />
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <PreviewCard
          href="/roulette"
          sketch="sketch"
          title={t("rouletteCardTitle")}
          description={t("rouletteCardDescription")}
          cta={t("rouletteCardCta")}
        />
        <PreviewCard
          href="/timeline"
          sketch="sketch-3"
          title={t("timelineCardTitle")}
          description={t("timelineCardDescription")}
          cta={t("timelineCardCta")}
        />
      </div>

      {recent.length > 0 && (
        <div className="mt-12">
          <h2 className="font-display text-2xl font-bold">{t("recentTitle")}</h2>
          <ul className="mt-5 grid gap-5 sm:grid-cols-3">
            {recent.map((memory, i) => (
              <li key={memory.id} style={{ rotate: `${[-1.4, 0.9, -0.5][i % 3]}deg` }}>
                <Link
                  href={`/memories/${memory.id}`}
                  className="polaroid block transition-transform hover:-translate-y-1.5 hover:rotate-[0.6deg]"
                >
                  {/* The memory's own photo when it has one; otherwise the
                      plain paper wash it had before. */}
                  <div
                    className="relative flex h-24 items-end overflow-hidden border border-ink/25 p-2"
                    style={{
                      background: ["var(--wash-1)", "var(--wash-2)", "var(--wash-3)"][i % 3],
                    }}
                  >
                    {memory.coverUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={memory.coverUrl}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    )}
                    {/* Over a photo the date becomes a small stuck-on label,
                        rather than a wash that eats half the picture. */}
                    <p
                      className={`relative font-mono text-[0.62rem] uppercase tracking-[0.14em] ${
                        memory.coverUrl
                          ? "bg-ink/75 px-1.5 py-0.5 text-ground"
                          : "text-ink-soft"
                      }`}
                    >
                      {formatDate(memory.memory_date)}
                    </p>
                  </div>
                  <p className="mt-2.5 px-0.5 font-display text-lg font-bold leading-tight">
                    {memory.title}
                  </p>
                  {memory.categories && (
                    <p className="px-0.5 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-muted">
                      {memory.categories.name}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function PreviewCard({
  href,
  sketch,
  title,
  description,
  cta,
}: {
  href: string;
  sketch: string;
  title: string;
  description: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className={`${sketch} block bg-surface p-7 transition-transform hover:-translate-y-1 hover:rotate-[-0.5deg]`}
    >
      <h3 className="font-display text-2xl font-bold leading-none">{title}</h3>
      <p className="mt-2.5 text-sm text-ink-soft">{description}</p>
      <span className="mt-5 inline-block font-mono text-[0.68rem] uppercase tracking-[0.18em] text-accent-1">
        {cta} →
      </span>
    </Link>
  );
}
