"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Field } from "@/components/ui/field";
import { saveCategoryAction, deleteCategoryAction, type CategoryFormState } from "./actions";
import type { CategoryWithCount } from "@/lib/data/memories";

const initialState: CategoryFormState = { error: null };
const SWATCHES = ["#F6E7E2", "#E6ECDF", "#E4E8F2", "#F7ECD2", "#C8452F", "#3A5B8C"];

export function CategoriesPanel({
  coupleId,
  categories,
}: {
  coupleId: string;
  categories: CategoryWithCount[];
}) {
  const t = useTranslations("Admin.categoriesTab");
  const [state, formAction, pending] = useActionState(saveCategoryAction, initialState);

  return (
    <div>
      {categories.length === 0 ? (
        <p className="sketch-soft mb-6 bg-surface-2 p-8 text-center text-sm text-ink-soft">
          {t("empty")}
        </p>
      ) : (
        <ul className="mb-6 flex flex-wrap gap-3">
          {categories.map((category) => (
            <li
              key={category.id}
              className="sketch-soft-2 flex items-center gap-2.5 bg-surface px-4 py-2 font-display text-lg font-bold"
            >
              <span className="h-3 w-3 rounded-full border border-ink" style={{ background: category.color }} />
              {category.name}
              <form action={deleteCategoryAction}>
                <input type="hidden" name="coupleId" value={coupleId} />
                <input type="hidden" name="id" value={category.id} />
                <button type="submit" aria-label={t("delete")} className="text-ink-soft">
                  ×
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} className="sketch-soft flex flex-wrap items-end gap-6 bg-surface-2 p-6">
        <input type="hidden" name="coupleId" value={coupleId} />
        <Field label={t("nameLabel")} name="name" placeholder={t("namePlaceholder")} required />
        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">{t("colorLabel")}</span>
          <div className="flex gap-2 pt-1.5">
            {SWATCHES.map((color, i) => (
              <label key={color}>
                <input
                  type="radio"
                  name="color"
                  value={color}
                  defaultChecked={i === 0}
                  className="peer sr-only"
                />
                <span
                  className="block h-7 w-7 cursor-pointer rounded-full border-2 border-line ring-offset-2 peer-checked:border-ink peer-checked:ring-2 peer-checked:ring-ink"
                  style={{ background: color }}
                />
              </label>
            ))}
          </div>
        </div>
        {state.error && <p className="w-full border-l-2 border-accent-1 px-3 py-1.5 text-sm font-medium text-accent-1">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="btn-ink"
        >
          {t("add")}
        </button>
      </form>
    </div>
  );
}
