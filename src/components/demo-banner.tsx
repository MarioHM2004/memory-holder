import { getTranslations } from "next-intl/server";

/**
 * Sits above every page of the demo diary.
 *
 * Says the two things a visitor needs: the memories aren't anyone's, and
 * nothing they try will stick. Without it, a diary that silently refuses
 * every change reads as broken rather than as a demonstration.
 */
export async function DemoBanner({ sandbox = false }: { sandbox?: boolean }) {
  const t = await getTranslations("Demo");

  return (
    <p className="sketch-soft-2 mb-6 bg-surface-2 px-4 py-2.5 text-sm text-ink-soft">
      {sandbox ? t("sandboxBanner") : t("banner")}
    </p>
  );
}
