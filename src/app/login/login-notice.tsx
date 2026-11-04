"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

/**
 * Explains how someone got sent back here: a confirmation or password link
 * that no longer works, or an account they just closed. Reads the query
 * string, so the page keeps it inside a <Suspense> boundary.
 */
export function LoginNotice() {
  const t = useTranslations("Auth.login");
  const params = useSearchParams();
  const deleted = params.get("deleted") === "1";
  const expired = params.get("error") === "link";
  if (!deleted && !expired) return null;

  return (
    <p
      role="alert"
      className={`mb-5 border-l-2 px-3 py-1.5 text-sm font-medium ${
        deleted ? "border-accent-2 text-ink" : "border-accent-1 text-accent-1"
      }`}
    >
      {deleted ? t("accountDeleted") : t("linkError")}
    </p>
  );
}
