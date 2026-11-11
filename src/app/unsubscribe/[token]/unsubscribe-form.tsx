"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { unsubscribeAction, type UnsubscribeState } from "./actions";

const initialState: UnsubscribeState = { done: false, failed: false };

export function UnsubscribeForm({ token }: { token: string }) {
  const t = useTranslations("Unsubscribe");
  const [state, formAction, pending] = useActionState(unsubscribeAction, initialState);

  if (state.done) {
    return (
      <>
        <p className="border-l-2 border-accent-2 px-3 py-2 text-sm font-medium text-ink">
          {t("done")}
        </p>
        <p className="mt-6 text-center text-sm text-ink-soft">{t("backOn")}</p>
      </>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="token" value={token} />
      <p className="text-sm leading-relaxed text-ink-soft">{t("question")}</p>

      {state.failed && (
        <p className="border-l-2 border-accent-1 px-3 py-1.5 text-sm font-medium text-accent-1">
          {t("error")}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-ink">
        {pending ? t("submitting") : t("confirm")}
      </button>

      <p className="text-center text-sm">
        <Link href="/" className="text-ink-soft underline underline-offset-2 hover:text-ink">
          {t("keep")}
        </Link>
      </p>
    </form>
  );
}
