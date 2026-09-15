"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export function InvitePanel({ inviteCode }: { inviteCode: string }) {
  const t = useTranslations("Admin.inviteTab");
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard?.writeText(inviteCode).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="sketch max-w-md bg-surface p-5 sm:p-7 md:flex-1">
      <p className="text-sm text-ink-soft">{t("description")}</p>
      <p className="my-5 border-2 border-dashed border-ink bg-ground-2 px-4 py-4 text-center font-mono text-xl font-bold tracking-[0.2em]">
        {inviteCode}
      </p>
      <button
        onClick={copy}
        className="btn-ink"
      >
        {copied ? t("copied") : t("copy")}
      </button>
    </div>
  );
}
