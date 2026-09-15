"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatDate } from "@/lib/format";
import { deleteMemoryAction } from "./actions";
import { MemoryForm } from "./memory-form";
import { editorNames, useEditingPresence } from "@/lib/use-editing-presence";
import type { Category } from "@/lib/types/database";
import type { MemoryForAdmin } from "@/lib/data/memories";

export function MemoriesPanel({
  coupleId,
  userId,
  displayName,
  memories,
  categories,
}: {
  coupleId: string;
  userId: string;
  displayName: string;
  memories: MemoryForAdmin[];
  categories: Pick<Category, "id" | "name" | "color">[];
}) {
  const t = useTranslations("Admin.memoriesTab");
  const locale = useLocale();
  const [editing, setEditing] = useState<MemoryForAdmin | "new" | null>(null);
  // The memory whose edit button was pressed while someone else had it open.
  // Only one person edits a memory at a time: the second gets a notice
  // instead of the form.
  const [blocked, setBlocked] = useState<string | null>(null);
  const editorsOf = useEditingPresence({
    coupleId,
    userId,
    name: displayName,
    memoryId: editing && editing !== "new" ? editing.id : null,
  });

  function startEditing(memory: MemoryForAdmin) {
    if (editorsOf(memory.id).length > 0) {
      setBlocked(memory.id);
      return;
    }
    setBlocked(null);
    setEditing(memory);
  }

  if (editing) {
    return (
      <MemoryForm
        coupleId={coupleId}
        categories={categories}
        memory={editing === "new" ? undefined : editing}
        onDone={() => setEditing(null)}
      />
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-ink-soft">
          {memories.length === 1
            ? t("countOne", { count: memories.length })
            : t("countOther", { count: memories.length })}
        </p>
        <button
          onClick={() => setEditing("new")}
          className="btn-ink"
        >
          {t("addButton")}
        </button>
      </div>

      {memories.length === 0 ? (
        <p className="sketch-soft bg-surface-2 p-8 text-center text-sm text-ink-soft">{t("empty")}</p>
      ) : (
        <ul className="divide-y divide-line">
          {memories.map((memory) => {
            const editors = editorsOf(memory.id);
            const names = editorNames(editors, userId, locale);
            return (
              <li key={memory.id} className="py-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="h-11 w-11 shrink-0 rounded-full border-2 border-ink"
                      style={{ background: memory.categories?.color ?? "var(--accent-2)" }}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <p className="truncate font-display text-xl font-bold leading-tight">{memory.title}</p>
                      <p className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted">
                        {memory.categories?.name ?? "—"} · {formatDate(memory.memory_date, locale)}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => startEditing(memory)}
                      aria-label={t("edit")}
                      className="btn-circle h-9 w-9"
                    >
                      ✎
                    </button>
                    <form action={deleteMemoryAction}>
                      <input type="hidden" name="coupleId" value={coupleId} />
                      <input type="hidden" name="id" value={memory.id} />
                      <button
                        type="submit"
                        aria-label={t("delete")}
                        className="btn-circle h-9 w-9"
                      >
                        🗑
                      </button>
                    </form>
                  </div>
                </div>

                {/* Live: once the other person closes their form the notice
                    goes away on its own, and the edit button works again. */}
                {blocked === memory.id && editors.length > 0 && (
                  <p
                    role="alert"
                    className="mt-3 border-l-2 border-accent-1 px-3 py-1.5 text-sm font-medium text-ink"
                  >
                    {names ? t("beingEdited", { name: names }) : t("beingEditedSelf")}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
