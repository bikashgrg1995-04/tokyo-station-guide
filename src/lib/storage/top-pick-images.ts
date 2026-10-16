/* ========================================
   Top pick photos (Cloudflare R2)

   Admins upload one photo per top pick. The file lives in the
   same R2 bucket as the facility icons (`ASSETS_BUCKET`) and
   `top_picks.image_url` stores its key. Older rows may still
   hold a plain http(s) URL; both kinds are shown.
   The website reads uploaded photos through /media/<key>.
======================================== */

import { checkIconFile, type IconCheck } from "./facility-icons";

export const TOP_PICK_IMAGE_PREFIX = "top-pick-images/";
export const MAX_TOP_PICK_IMAGE_BYTES = 2 * 1024 * 1024;

/** True when the stored value is an R2 object key. */
export function isUploadedTopPickImage(
  value: string | null | undefined,
): value is string {
  return (
    typeof value === "string" && value.startsWith(TOP_PICK_IMAGE_PREFIX)
  );
}

/** Address to put in an <img>, for either an uploaded key or an old URL. */
export function topPickImageSrc(value: string | null | undefined): string {
  if (!value) return "";

  return isUploadedTopPickImage(value) ? `/media/${value}` : value;
}

/** The file field value, or null when nothing was chosen. */
export function readTopPickImageFile(
  formData: FormData,
  field = "image_file",
): File | null {
  const value = formData.get(field);

  return value instanceof File && value.size > 0 ? value : null;
}

/* Photos only: PNG, JPEG or WebP, up to 2 MB. Type is read from the bytes. */
export async function checkTopPickImage(file: File): Promise<IconCheck> {
  const check = await checkIconFile(
    file,
    MAX_TOP_PICK_IMAGE_BYTES,
    "Image must be 2 MB or smaller.",
  );

  if (check.ok && check.ext === "svg") {
    return { ok: false, error: "Use a PNG, WebP or JPEG image." };
  }

  if (!check.ok && check.error.startsWith("Use a PNG, WebP, JPEG or SVG")) {
    return { ok: false, error: "Use a PNG, WebP or JPEG image." };
  }

  return check;
}

/** Store a checked image and return its key. */
export async function saveTopPickImage(
  bucket: R2Bucket,
  slug: string,
  check: Extract<IconCheck, { ok: true }>,
): Promise<string> {
  const key = `${TOP_PICK_IMAGE_PREFIX}${slug}-${Date.now().toString(36)}.${check.ext}`;

  await bucket.put(key, check.bytes, {
    httpMetadata: {
      contentType: check.contentType,
      cacheControl: "public, max-age=31536000, immutable",
    },
  });

  return key;
}

/** Remove an uploaded image. Failures are logged, never thrown. */
export async function deleteTopPickImage(
  bucket: R2Bucket | undefined,
  value: string | null | undefined,
): Promise<void> {
  if (!bucket || !isUploadedTopPickImage(value)) {
    return;
  }

  try {
    await bucket.delete(value);
  } catch (err) {
    console.error("Failed to delete top pick image from R2:", err);
  }
}
