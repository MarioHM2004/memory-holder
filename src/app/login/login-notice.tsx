"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

/**
 * Explains why someone was sent back here — right now only a confirmation or
 * password link that no longer works. Reads the query string, so the page
 * keeps it inside a <Suspense> boundary.
 */
export function LoginNotice() {
  const t = useTranslations("Auth.login");
  if (useSearchParams().get("error") !== "link") return null;

  return (
    <p
      role="alert"
      className="mb-5 border-l-2 border-accent-1 px-3 py-1.5 text-sm font-medium text-accent-1"
    >
      {t("linkError")}
    </p>
  );
}
