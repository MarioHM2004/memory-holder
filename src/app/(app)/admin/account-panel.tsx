"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { signOut } from "@/app/(app)/actions";
import { deleteAccountAction, type DeleteAccountState } from "./actions";
import { WeeklyEmailToggle } from "./weekly-email-toggle";

const initialState: DeleteAccountState = { error: null };

/** Everything about the person rather than the diary: password, and leaving for good. */
export function AccountPanel({ email, weeklyEmail }: { email: string; weeklyEmail: boolean }) {
  const t = useTranslations("Admin.account");
  const tNav = useTranslations("Nav");
  const tCommon = useTranslations("Common");
  const [state, formAction, pending] = useActionState(deleteAccountAction, initialState);
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start">
      <div className="sketch max-w-md bg-surface p-5 sm:p-7 md:flex-1">
        <h3 className="font-display text-2xl font-bold leading-none">{t("title")}</h3>
        <p className="mt-2 break-all text-sm text-ink-soft">{email}</p>

        <div className="mt-5 border-t border-line pt-5">
          <WeeklyEmailToggle enabled={weeklyEmail} />
        </div>

        <Link href="/account/password" className="btn-quiet mt-5 inline-block">
          {t("changePassword")}
        </Link>

        {/* Phone only: the rail holds these from lg up. Language and theme
            stay in the phone header instead — they get touched; these two
            are looked for once. */}
        <div className="mt-7 lg:hidden">
          <div className="drawn-rule h-2 w-full" aria-hidden />
          <div className="mt-4 flex items-center gap-4">
            <Link
              href="/privacy"
              className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-muted hover:text-ink"
            >
              {tCommon("privacy")}
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-muted hover:text-accent-1"
              >
                {tNav("signOut")}
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="sketch-soft max-w-md bg-surface-2 p-5 sm:p-7 md:flex-1">
        <h3 className="font-display text-2xl font-bold leading-none">{t("deleteTitle")}</h3>
        <p className="mt-2 text-sm text-ink-soft">{t("deleteDescription")}</p>

        {!confirming ? (
          <button type="button" onClick={() => setConfirming(true)} className="btn-quiet mt-5">
            {t("deleteButton")}
          </button>
        ) : (
          <form action={formAction} className="mt-5 flex flex-col gap-4">
            <p className="border-l-2 border-accent-1 px-3 py-1.5 text-sm font-medium text-accent-1">
              {t("deleteWarning")}
            </p>

            {/* The password, not a typed-out phrase: the point is to stop
                someone else using a session left open, not to slow you down. */}
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">
                {t("passwordLabel")}
              </span>
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="border-b-2 border-line bg-transparent px-1 py-2 text-ink outline-none focus:border-ink"
              />
            </label>

            {state.error && (
              <p className="border-l-2 border-accent-1 px-3 py-1.5 text-sm font-medium text-accent-1">
                {state.error}
              </p>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={pending}
                className="btn-quiet"
              >
                {t("cancel")}
              </button>
              <button type="submit" disabled={pending} className="btn-ink">
                {pending ? t("deleting") : t("deleteConfirm")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
