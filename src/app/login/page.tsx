"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Field } from "@/components/ui/field";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Wordmark } from "@/components/wordmark";
import { ThemeToggle } from "@/components/theme-toggle";
import { login, type AuthActionState } from "./actions";

const initialState: AuthActionState = { error: null };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);
  const t = useTranslations("Auth.login");

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="sketch w-full max-w-sm bg-surface p-8">
        <div className="mb-7 text-center">
          <Wordmark />
          <p className="mt-2 font-display text-lg text-ink-soft">{t("subtitle")}</p>
        </div>

        <form action={formAction} className="flex flex-col gap-5">
          <Field label={t("email")} name="email" type="email" required />
          <Field label={t("password")} name="password" type="password" required />

          {state.error && (
            <p className="border-l-2 border-accent-1 px-3 py-1.5 text-sm font-medium text-accent-1">
              {state.error}
            </p>
          )}

          <button type="submit" disabled={pending} className="btn-ink mt-1">
            {pending ? t("submitting") : t("submit")}
          </button>
        </form>

        <p className="mt-7 text-center text-sm text-ink-soft">
          {t("noAccount")}{" "}
          <Link
            href="/signup"
            className="font-display text-lg font-bold text-ink underline decoration-accent-1 decoration-2 underline-offset-2"
          >
            {t("createAccount")}
          </Link>
        </p>

        <div className="drawn-rule mt-7 h-2 w-full" aria-hidden />
        <div className="mt-4 flex items-end justify-center gap-4">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
