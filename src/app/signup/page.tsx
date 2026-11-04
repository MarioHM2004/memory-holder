"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Field } from "@/components/ui/field";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Wordmark } from "@/components/wordmark";
import { ThemeToggle } from "@/components/theme-toggle";
import { signUp, type SignUpActionState } from "./actions";

const initialState: SignUpActionState = { error: null, info: null };

export default function SignUpPage() {
  const [state, formAction, pending] = useActionState(signUp, initialState);
  const t = useTranslations("Auth.signup");
  const tCommon = useTranslations("Common");

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="sketch-2 w-full max-w-sm bg-surface p-8">
        <div className="mb-7 text-center">
          <Wordmark />
          <p className="mt-2 font-display text-lg text-ink-soft">{t("subtitle")}</p>
        </div>

        {state.info ? (
          <p className="border-l-2 border-accent-2 px-3 py-2 text-sm font-medium text-ink">
            {state.info}
          </p>
        ) : (
          <form action={formAction} className="flex flex-col gap-5">
            <Field label={t("name")} name="displayName" required />
            <Field label={t("email")} name="email" type="email" required />
            <Field label={t("password")} name="password" type="password" required minLength={8} />

            {state.error && (
              <p className="border-l-2 border-accent-1 px-3 py-1.5 text-sm font-medium text-accent-1">
                {state.error}
              </p>
            )}

            <button type="submit" disabled={pending} className="btn-ink mt-1">
              {pending ? t("submitting") : t("submit")}
            </button>
          </form>
        )}

        <p className="mt-7 text-center text-sm text-ink-soft">
          {t("haveAccount")}{" "}
          <Link
            href="/login"
            className="font-display text-lg font-bold text-ink underline decoration-accent-1 decoration-2 underline-offset-2"
          >
            {t("signIn")}
          </Link>
        </p>

        <div className="drawn-rule mt-7 h-2 w-full" aria-hidden />
        <div className="mt-4 flex items-end justify-center gap-4">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
        <p className="mt-5 text-center">
          <Link
            href="/privacy"
            className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted hover:text-ink"
          >
            {tCommon("privacy")}
          </Link>
        </p>
      </div>
    </div>
  );
}
