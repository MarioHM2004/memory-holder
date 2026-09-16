"use client";

/**
 * Downscaled copies of a photo, made in the browser before upload.
 *
 * A phone photo is several megabytes; the gallery only ever draws it at ~440px
 * tall, and the filmstrip at 80px. Generating the small copies here means the
 * heavy original is uploaded once and then essentially never downloaded again.
 */

/** Filmstrip thumbnails and the bubble hover preview. */
export const THUMB_MAX_SIDE = 400;
/** The main viewer. Generous enough to stay sharp on a HiDPI screen. */
export const PREVIEW_MAX_SIDE = 1600;

const THUMB_QUALITY = 0.72;
const PREVIEW_QUALITY = 0.82;

/** Draws `source` into a canvas no larger than `maxSide`, or null if it already fits. */
function scaledCanvas(source: CanvasImageSource & { width: number; height: number }, maxSide: number) {
  const longest = Math.max(source.width, source.height);
  if (longest <= maxSide) return null;

  const scale = maxSide / longest;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(source.width * scale);
  canvas.height = Math.round(source.height * scale);

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

async function toWebp(canvas: HTMLCanvasElement, quality: number) {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/webp", quality);
  });
  // A browser without WebP encoding (Safari) hands back a PNG, which for a
  // photo can be larger than the JPEG we started from. Not worth uploading.
  return blob && blob.type === "image/webp" ? blob : null;
}

/** Frees a canvas's pixels now instead of whenever it's garbage collected. */
function release(canvas: HTMLCanvasElement | null) {
  if (!canvas) return;
  canvas.width = 0;
  canvas.height = 0;
}

/**
 * The preview and thumbnail WebP copies of a photo. Either is null when one
 * isn't worth making — the source is already small enough, or the browser
 * can't decode or encode this format (HEIC, say, or WebP on Safari). Callers
 * fall back to the original in that case, so a null is a missed
 * optimisation, never a failed upload.
 *
 * The photo is decoded once, and the thumbnail is drawn from the preview
 * rather than from the original. Decoding it twice at once, as this used to,
 * held two full-resolution bitmaps in memory together: about 400MB for a
 * 50MP phone photo, enough for a mobile browser to kill the tab mid-upload.
 * Canvases are also emptied as soon as they're encoded, since iOS Safari caps
 * the total canvas memory a page may hold and reclaims it slowly.
 */
export async function makeDerivatives(file: File): Promise<{ preview: Blob | null; thumb: Blob | null }> {
  const none = { preview: null, thumb: null };
  if (typeof createImageBitmap !== "function") return none;

  let bitmap: ImageBitmap;
  try {
    // from-image so a portrait photo carrying EXIF rotation isn't baked sideways.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return none;
  }

  let previewCanvas: HTMLCanvasElement | null = null;
  let thumbCanvas: HTMLCanvasElement | null = null;
  try {
    previewCanvas = scaledCanvas(bitmap, PREVIEW_MAX_SIDE);
    // Done with the full-size pixels as soon as the preview holds a copy.
    const thumbSource = previewCanvas ?? bitmap;
    thumbCanvas = scaledCanvas(thumbSource, THUMB_MAX_SIDE);
    bitmap.close();

    const preview = previewCanvas ? await toWebp(previewCanvas, PREVIEW_QUALITY) : null;
    const thumb = thumbCanvas ? await toWebp(thumbCanvas, THUMB_QUALITY) : null;
    return { preview, thumb };
  } catch {
    return none;
  } finally {
    bitmap.close();
    release(previewCanvas);
    release(thumbCanvas);
  }
}
