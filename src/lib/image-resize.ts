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

/**
 * Returns a WebP copy bounded by `maxSide`, or null when one isn't worth
 * making — the source is already small enough, or the browser can't decode
 * this format (HEIC, say). Callers fall back to the original in that case,
 * so a null is a missed optimisation, never a failed upload.
 */
export async function downscaleImage(file: File, maxSide: number, quality: number) {
  if (typeof createImageBitmap !== "function") return null;

  let bitmap: ImageBitmap;
  try {
    // from-image so a portrait photo carrying EXIF rotation isn't baked sideways.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return null;
  }

  try {
    const longest = Math.max(bitmap.width, bitmap.height);
    if (longest <= maxSide) return null;

    const scale = maxSide / longest;
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", quality);
    });

    // A browser without WebP encoding hands back a PNG, which for a photo can
    // be larger than the JPEG we started from. Not worth uploading.
    if (!blob || blob.type !== "image/webp") return null;
    return blob;
  } finally {
    bitmap.close();
  }
}

export function makeThumbnail(file: File) {
  return downscaleImage(file, THUMB_MAX_SIDE, THUMB_QUALITY);
}

export function makePreview(file: File) {
  return downscaleImage(file, PREVIEW_MAX_SIDE, PREVIEW_QUALITY);
}
