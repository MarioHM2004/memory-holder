"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { leaveDiaryAction, type LeaveDiaryState } from "./actions";
import { diaryNameMatches } from "@/lib/format";

const initialState: LeaveDiaryState = { error: null };

export function LeaveDiary({
  coupleId,
  diaryName,
  memberCount,
}: {
  coupleId: string;
  diaryName: string;
  memberCount: number;
}) {
  const t = useTranslations("Admin.leaveDiary");
  const [state, formAction, pending] = useActionState(leaveDiaryAction, initialState);
  const [confirming, setConfirming] = useState(false);
  const [typedName, setTypedName] = useState("");
  // Leaving as the last member deletes the diary for good, so that case asks
  // for the diary's name to be typed rather than a single click.
  const last = memberCount <= 1;
  const nameMatches = diaryNameMatches(typedName, diaryName);

  return (
    <div className="sketch-soft max-w-md bg-surface-2 p-5 sm:p-7 md:flex-1">
      <h3 className="font-display text-2xl font-bold leading-none">{t("title")}</h3>
      <p className="mt-2 text-sm text-ink-soft">
        {last ? t("descriptionLast") : t("description", { count: memberCount - 1 })}
      </p>

      {!confirming ? (
        <button type="button" onClick={() => setConfirming(true)} className="btn-quiet mt-5">
          {t("button")}
        </button>
      ) : (
        <form action={formAction} className="mt-5 flex flex-col gap-4">
          <input type="hidden" name="coupleId" value={coupleId} />

          <p className="border-l-2 border-accent-1 px-3 py-1.5 text-sm font-medium text-accent-1">
            {last ? t("warningLast", { name: diaryName }) : t("warning", { name: diaryName })}
          </p>

          {last && (
            // Controlled, unlike the shared Field, so the button can wait
            // for the name to match.
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">
                {t.rich("confirmNameLabel", {
                  name: diaryName,
                  // The label is small caps; the name inside it is not, so it
                  // reads with the capitalisation the diary actually has.
                  diary: (chunks) => <span className="normal-case">{chunks}</span>,
                })}
              </span>
              <input
                name="confirmName"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                autoComplete="off"
                required
                className="border-b-2 border-line bg-transparent px-1 py-2 text-ink outline-none placeholder:text-muted focus:border-ink"
              />
            </label>
          )}

          {state.error && (
            <p className="border-l-2 border-accent-1 px-3 py-1.5 text-sm font-medium text-accent-1">
              {state.error}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                setTypedName("");
              }}
              disabled={pending}
              className="btn-quiet"
            >
              {t("cancel")}
            </button>
            <button type="submit" disabled={pending || (last && !nameMatches)} className="btn-ink">
              {pending ? t("leaving") : last ? t("confirmLast") : t("confirm")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
