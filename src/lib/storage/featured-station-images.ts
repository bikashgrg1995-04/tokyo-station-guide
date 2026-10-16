/* ========================================
   Featured station photos (Cloudflare R2)

   Each featured station has one photo, uploaded by an admin and
   stored in the `ASSETS_BUCKET` bucket. `featured_stations.image_url`
   stores its key. Older rows may still hold a plain http(s) URL;
   both kinds are shown. Uploaded photos are served through /media/<key>.
======================================== */

import { checkIconFile, type IconCheck } from "./facility-icons";

export const FEATURED_IMAGE_PREFIX = "featured-station-images/";
export const MAX_FEATURED_IMAGE_BYTES = 2 * 1024 * 1024;

export function isUploadedFeaturedImage(
  value: string | null | undefined,
): value is string {
  return typeof value === "string" && value.startsWith(FEATURED_IMAGE_PREFIX);
}

/** Address to put in an <img>, for either an uploaded key or an old URL. */
export function featuredImageSrc(value: string | null | undefined): string {
  if (!value) return "";

  return isUploadedFeaturedImage(value) ? `/media/${value}` : value;
}

export function readFeaturedImageFile(
  formData: FormData,
  field = "image_file",
): File | null {
  const value = formData.get(field);

  return value instanceof File && value.size > 0 ? value : null;
}

/* Photos only: PNG, JPEG or WebP, up to 2 MB. Type is read from the bytes. */
export async function checkFeaturedImage(file: File): Promise<IconCheck> {
  const check = await checkIconFile(
    file,
    MAX_FEATURED_IMAGE_BYTES,
    "Image must be 2 MB or smaller.",
  );

  if (
    (check.ok && check.ext === "svg") ||
    (!check.ok && check.error.startsWith("Use a PNG, WebP, JPEG or SVG"))
  ) {
    return { ok: false, error: "Use a PNG, WebP or JPEG image." };
  }

  return check;
}

export async function saveFeaturedImage(
  bucket: R2Bucket,
  slug: string,
  check: Extract<IconCheck, { ok: true }>,
): Promise<string> {
  const key = `${FEATURED_IMAGE_PREFIX}${slug}-${Date.now().toString(36)}.${check.ext}`;

  await bucket.put(key, check.bytes, {
    httpMetadata: {
      contentType: check.contentType,
      cacheControl: "public, max-age=31536000, immutable",
    },
  });

  return key;
}

/** Remove an uploaded photo. Failures are logged, never thrown. */
export async function deleteFeaturedImage(
  bucket: R2Bucket | undefined,
  value: string | null | undefined,
): Promise<void> {
  if (!bucket || !isUploadedFeaturedImage(value)) {
    return;
  }

  try {
    await bucket.delete(value);
  } catch (err) {
    console.error("Failed to delete featured station photo from R2:", err);
  }
}
