import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { signupSlotsLeft } from "@/lib/data/signup-slots";
import { startSandboxAction } from "@/app/sandbox/actions";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Wordmark } from "@/components/wordmark";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * What someone sees before they have an account.
 *
 * Until now this address went straight to the sign-in form, which told a
 * visitor nothing and left a search engine with a page of two input fields
 * to judge the whole site by. Signed in, it hands over to the diary.
 */
export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // /home guards itself, and sends anyone without a diary on to onboarding.
  if (user) redirect("/home");

  const t = await getTranslations("Landing");
  const tDemo = await getTranslations("Demo");
  // Switched on once the diary the sandboxes are copied from exists, so the
  // front page never offers a door that opens onto an error.
  const demoEnabled = process.env.DEMO_ENABLED === "true";
  // startSandboxAction sends anyone it couldn't let in back here.
  const demoFailed = (await searchParams).error === "demo";
  const open = (await signupSlotsLeft()) > 0;
  const features = ["timeline", "roulette", "categories"] as const;
  // Each card wears a different hand-drawn border, as everywhere else. All
  // three inked: the pencil-weight variants are for boxes that shouldn't
  // shout, and next to two inked neighbours one of those reads as unfinished.
  const borders = ["sketch", "sketch-3", "sketch-2"];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:py-16">
      <header className="sketch-2 bg-surface px-6 py-12 text-center sm:px-12 sm:py-16">
        <Wordmark size="lg" />
        <h1 className="mx-auto mt-7 max-w-xl text-balance font-marker text-3xl leading-tight sm:text-[2.6rem]">
          {t("heading")}
        </h1>
        <p className="mx-auto mt-5 max-w-lg text-pretty text-lg text-ink-soft">{t("subheading")}</p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          {open && (
            <Link href="/signup" className="btn-ink">
              {t("ctaCreate")}
            </Link>
          )}
          <Link href="/login" className={open ? "btn-quiet" : "btn-ink"}>
            {t("ctaLogin")}
          </Link>
        </div>

        {!open && (
          <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-ink-soft">
            {t("full")}
          </p>
        )}

        <p className="mt-7 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-muted">
          {t("languages")}
        </p>
      </header>

      <section className="mt-14">
        <h2 className="text-center font-display text-2xl font-bold">{t("featuresTitle")}</h2>
        <div className="drawn-rule mx-auto mt-4 h-2 w-40" aria-hidden />

        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          {features.map((feature, i) => (
            <div key={feature} className={`${borders[i]} bg-surface p-6`}>
              <h3 className="font-display text-xl font-bold leading-none">
                {t(`${feature}.title`)}
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">{t(`${feature}.body`)}</p>
            </div>
          ))}
        </div>
      </section>

      {demoEnabled && (
        <section className="sketch-3 mt-14 bg-surface p-7 sm:p-10">
          <h2 className="font-display text-2xl font-bold leading-none">{tDemo("title")}</h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-ink-soft">{tDemo("body")}</p>

          {demoFailed && (
            <p className="sketch-soft-2 mt-5 bg-surface-2 px-4 py-2.5 text-sm text-ink-soft">
              {tDemo("error")}
            </p>
          )}

          {/* A form, not a link: the diary is built on the way in, and a
              crawler following a link shouldn't create one. */}
          <form action={startSandboxAction}>
            <button type="submit" className="btn-ink mt-6">
              {tDemo("cta")}
            </button>
          </form>
        </section>
      )}

      <section className="sketch-soft mt-14 bg-surface-2 p-7 sm:p-10">
        <h2 className="font-display text-2xl font-bold leading-none">{t("privateTitle")}</h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-ink-soft">{t("privateBody")}</p>
        <Link
          href="/privacy"
          className="mt-4 inline-block font-mono text-[0.68rem] uppercase tracking-[0.16em] text-accent-1 underline underline-offset-4"
        >
          {t("privateLink")} →
        </Link>
      </section>

      <section className="mt-14 text-center">
        <h2 className="font-marker text-2xl leading-tight">{t("closingTitle")}</h2>
        <p className="mx-auto mt-3 max-w-md text-ink-soft">
          {open ? t("closingBody") : t("full")}
        </p>
        {open && (
          <Link href="/signup" className="btn-ink mt-6 inline-block">
            {t("ctaCreate")}
          </Link>
        )}
      </section>

      <footer className="mt-16">
        <div className="drawn-rule h-2 w-full" aria-hidden />
        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <Link
            href="/privacy"
            className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted hover:text-ink"
          >
            {t("privateLink")}
          </Link>
          <div className="flex items-end gap-4">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </footer>
    </div>
  );
}
