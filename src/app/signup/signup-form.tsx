"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Field } from "@/components/ui/field";
import { signUp, type SignUpActionState } from "./actions";

const initialState: SignUpActionState = { error: null, detail: null, info: null };

export function SignUpForm() {
  const [state, formAction, pending] = useActionState(signUp, initialState);
  const t = useTranslations("Auth.signup");

  if (state.info) {
    return (
      <p className="border-l-2 border-accent-2 px-3 py-2 text-sm font-medium text-ink">
        {state.info}
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Field label={t("name")} name="displayName" required />
      <Field label={t("email")} name="email" type="email" required />
      <Field label={t("password")} name="password" type="password" required minLength={8} />

      {state.error && (
        <div className="border-l-2 border-accent-1 px-3 py-1.5 text-accent-1">
          <p className="text-sm font-medium">{state.error}</p>
          {/* The raw reason is for us, not for them: it's what turns a
              screenshot into a diagnosis. */}
          {state.detail && (
            <p className="mt-1 break-words font-mono text-[0.68rem] text-ink-soft">
              {state.detail}
            </p>
          )}
        </div>
      )}

      <button type="submit" disabled={pending} className="btn-ink mt-1">
        {pending ? t("submitting") : t("submit")}
      </button>
    </form>
  );
}
