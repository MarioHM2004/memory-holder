"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Field } from "@/components/ui/field";
import { createCoupleAction, joinCoupleAction, type OnboardingActionState } from "./actions";

const initialState: OnboardingActionState = { error: null };

export function OnboardingForms() {
  const t = useTranslations("Onboarding");
  const [createState, createFormAction, creating] = useActionState(
    createCoupleAction,
    initialState,
  );
  const [joinState, joinFormAction, joining] = useActionState(joinCoupleAction, initialState);

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="sketch bg-surface p-7">
        <h2 className="font-display text-2xl font-bold leading-none">{t("create.title")}</h2>
        <p className="mt-1 text-sm text-ink-soft">{t("create.description")}</p>
        <form action={createFormAction} className="mt-5 flex flex-col gap-4">
          <Field
            label={t("create.nameLabel")}
            name="name"
            placeholder={t("create.namePlaceholder")}
            required
          />
          {createState.error && (
            <p className="border-l-2 border-accent-1 px-3 py-1.5 text-sm font-medium text-accent-1">
              {createState.error}
            </p>
          )}
          <button
            type="submit"
            disabled={creating}
            className="btn-ink mt-1"
          >
            {creating ? t("create.submitting") : t("create.submit")}
          </button>
        </form>
      </div>

      <div className="sketch-3 bg-surface p-7">
        <h2 className="font-display text-2xl font-bold leading-none">{t("join.title")}</h2>
        <p className="mt-1 text-sm text-ink-soft">{t("join.description")}</p>
        <form action={joinFormAction} className="mt-5 flex flex-col gap-4">
          <Field
            label={t("join.codeLabel")}
            name="code"
            placeholder="MH-XXXX-XXXX"
            required
          />
          {joinState.error && (
            <p className="border-l-2 border-accent-1 px-3 py-1.5 text-sm font-medium text-accent-1">
              {joinState.error}
            </p>
          )}
          <button
            type="submit"
            disabled={joining}
            className="btn-quiet mt-1"
          >
            {joining ? t("join.submitting") : t("join.submit")}
          </button>
        </form>
      </div>
    </div>
  );
}
