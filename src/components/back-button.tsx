"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export function BackButton() {
  const router = useRouter();
  const t = useTranslations("Common");

  return (
    <button
      onClick={() => router.back()}
      aria-label={t("back")}
      className="btn-circle h-10 w-10 shrink-0 text-lg"
    >
      ←
    </button>
  );
}
