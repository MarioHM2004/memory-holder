import { formatDate } from "@/lib/format";

/**
 * What the export endpoint hands over, and what the browser turns into a zip.
 *
 * The photo URLs are signed Supabase links, so the browser fetches them from
 * Supabase directly. Streaming a hundred megabytes of photos through a Vercel
 * function would sit against its time limit and spend the site's bandwidth
 * allowance to move bytes that were never going to touch the server anyway.
 */
export interface ExportMedia {
  /** Where it goes inside the archive, e.g. "photos/2026-09-03-first-trip-1.webp". */
  path: string;
  url: string;
}

export interface ExportMemory {
  id: string;
  title: string;
  description: string;
  body: string;
  date: string;
  category: string | null;
  media: ExportMedia[];
}

export interface ExportManifest {
  diary: string;
  exportedAt: string;
  memories: ExportMemory[];
}

/** A filename that survives every operating system, from a memory's title. */
export function slugify(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "memory"
  );
}

/**
 * The diary as one readable document, for the copy that outlives the app.
 * JSON is what a machine would reimport; this is what you'd actually open in
 * ten years, and it needs nothing but a text editor.
 */
export function renderDiaryMarkdown(manifest: ExportManifest, locale: string) {
  const lines: string[] = [
    `# ${manifest.diary}`,
    "",
    `${manifest.memories.length} memories · exported ${formatDate(manifest.exportedAt.slice(0, 10), locale)}`,
    "",
  ];

  for (const memory of manifest.memories) {
    lines.push(`## ${memory.title}`, "");
    lines.push(
      [formatDate(memory.date, locale), memory.category].filter(Boolean).join(" · "),
      "",
    );
    if (memory.description) lines.push(memory.description, "");
    if (memory.body) lines.push(memory.body, "");
    for (const item of memory.media) lines.push(`![](${item.path})`);
    if (memory.media.length > 0) lines.push("");
    lines.push("---", "");
  }

  return lines.join("\n");
}
