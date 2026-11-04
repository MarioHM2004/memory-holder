"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Field } from "@/components/ui/field";
import { updatePassword, type UpdatePasswordState } from "./actions";

const initialState: UpdatePasswordState = { error: null };

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(updatePassword, initialState);
  const t = useTranslations("Auth.password");

  return (
    <>
      <form action={formAction} className="flex flex-col gap-5">
        <Field
          label={t("newPassword")}
          name="password"
          type="password"
          required
          minLength={8}
        />

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
        <Link
          href="/home"
          className="font-display text-lg font-bold text-ink underline decoration-accent-1 decoration-2 underline-offset-2"
        >
          {t("back")}
        </Link>
      </p>
    </>
  );
}
