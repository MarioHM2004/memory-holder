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


/** Keeps a title with an ampersand or a quote in it from breaking the page. */
function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * The diary as one page you can open by double-clicking it.
 *
 * HTML rather than PDF because of Chinese: a PDF has to carry a font for it,
 * megabytes of one, while a browser already has fonts installed. And this
 * gives a PDF anyway — open it, print, save as PDF — where the reverse isn't
 * possible. The print rules below are there for exactly that.
 *
 * It needs the photos/ folder beside it, which it has inside the archive.
 *
 * `subtitle` is passed in already worded rather than built here: this runs in
 * the browser, where the translations live behind a hook.
 */
export function renderDiaryHtml(manifest: ExportManifest, locale: string, subtitle: string) {
  const title = escapeHtml(manifest.diary);

  const memories = manifest.memories
    .map((memory) => {
      const eyebrow = [formatDate(memory.date, locale), memory.category]
        .filter(Boolean)
        .map((part) => escapeHtml(String(part)))
        .join(" &middot; ");

      const photos = memory.media
        .map((item) => `<figure><img src="${escapeHtml(item.path)}" alt="" loading="lazy"></figure>`)
        .join("");

      return `<article>
  <p class="eyebrow">${eyebrow}</p>
  <h2>${escapeHtml(memory.title)}</h2>
  ${memory.description ? `<p class="lead">${escapeHtml(memory.description)}</p>` : ""}
  ${memory.body ? `<div class="body">${escapeHtml(memory.body)}</div>` : ""}
  ${photos}
</article>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="${escapeHtml(locale)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  /* No web fonts on purpose: this has to open from a folder, offline, in
     ten years. The CJK families are listed so Chinese entries don't fall
     back to something that ignores the rest of the page. */
  :root { color-scheme: light; }
  body {
    margin: 0 auto; padding: 3rem 1.25rem 5rem; max-width: 44rem;
    background: #fbfaf7; color: #171614; line-height: 1.65;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial,
      "PingFang SC", "Microsoft YaHei", sans-serif;
  }
  header { border-bottom: 2px solid #171614; padding-bottom: 1.5rem; margin-bottom: 2.5rem; }
  h1 { margin: 0; font-size: 2rem; line-height: 1.2; }
  .meta { margin: .5rem 0 0; font-size: .75rem; letter-spacing: .18em; text-transform: uppercase; color: #8e8a80; }
  article { margin: 0 0 4rem; }
  .eyebrow { margin: 0 0 .35rem; font-size: .72rem; letter-spacing: .14em; text-transform: uppercase; color: #8e8a80; }
  h2 { margin: 0 0 .75rem; font-size: 1.5rem; line-height: 1.25; }
  .lead { margin: 0 0 1rem; color: #56534c; }
  /* pre-line keeps the paragraph breaks someone typed, without needing the
     text to have been written as HTML. */
  .body { margin: 0 0 1.25rem; white-space: pre-line; }
  figure { margin: 0 0 1rem; background: #fff; border: 1px solid rgba(23,22,20,.25); padding: .75rem .75rem 2rem; }
  img { display: block; width: 100%; height: auto; }

  @media print {
    body { background: #fff; padding: 0; max-width: none; }
    /* Whole articles are not kept together: one with twelve photos would
       throw away most of a page. Headings stay with what follows them and a
       photo is never split down the middle, which is what actually shows. */
    h2, .eyebrow { break-after: avoid; }
    figure, article > p { break-inside: avoid; }
    article { margin-bottom: 2.5rem; }
  }
</style>
</head>
<body>
<header>
  <h1>${title}</h1>
  <p class="meta">${escapeHtml(subtitle)}</p>
</header>
${memories}
</body>
</html>`;
}
