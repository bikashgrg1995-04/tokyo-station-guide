/* ========================================
   Facility icon files (Cloudflare R2)

   Admins upload an icon image for a facility.
   The file lives in the client's R2 bucket, bound
   as `ASSETS_BUCKET` in wrangler.client.jsonc;
   `facilities.icon` stores its key.
   The website reads it through /media/<key>.
======================================== */

export const ICON_PREFIX = "facility-icons/";
export const MAX_ICON_BYTES = 512 * 1024;

/** The R2 bucket for uploads, or undefined when it is not bound. */
export function iconBucket(env: object): R2Bucket | undefined {
  return (env as { ASSETS_BUCKET?: R2Bucket }).ASSETS_BUCKET;
}

export type IconCheck =
  | { ok: true; ext: string; contentType: string; bytes: ArrayBuffer }
  | { ok: false; error: string };

/** True when the stored icon value is an R2 object key. */
export function isUploadedIcon(value: string | null | undefined): value is string {
  return typeof value === "string" && value.startsWith(ICON_PREFIX);
}

/** Public URL of an uploaded icon. */
export function iconUrl(key: string): string {
  return `/media/${key}`;
}

/** The file field value, or null when nothing was chosen. */
export function readIconFile(formData: FormData, field = "icon_file"): File | null {
  const value = formData.get(field);

  return value instanceof File && value.size > 0 ? value : null;
}

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  return signature.every((b, i) => bytes[offset + i] === b);
}

/*
 * The type is decided from the file's own bytes,
 * never from the name or the browser's content type.
 */
export async function checkIconFile(file: File): Promise<IconCheck> {
  if (file.size > MAX_ICON_BYTES) {
    return { ok: false, error: "Icon must be 512 KB or smaller." };
  }

  const bytes = await file.arrayBuffer();
  const head = new Uint8Array(bytes.slice(0, 16));

  if (startsWith(head, [0x89, 0x50, 0x4e, 0x47])) {
    return { ok: true, ext: "png", contentType: "image/png", bytes };
  }

  if (startsWith(head, [0xff, 0xd8, 0xff])) {
    return { ok: true, ext: "jpg", contentType: "image/jpeg", bytes };
  }

  if (startsWith(head, [0x52, 0x49, 0x46, 0x46]) && startsWith(head, [0x57, 0x45, 0x42, 0x50], 8)) {
    return { ok: true, ext: "webp", contentType: "image/webp", bytes };
  }

  const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);

  if (/<svg[\s>]/i.test(text)) {
    if (
      /<script|<foreignObject|<iframe|<!ENTITY|javascript:|\son[a-z]+\s*=/i.test(text)
    ) {
      return {
        ok: false,
        error: "This SVG contains scripts or unsafe content. Export a plain SVG.",
      };
    }

    return { ok: true, ext: "svg", contentType: "image/svg+xml", bytes };
  }

  return { ok: false, error: "Use a PNG, WebP, JPEG or SVG image." };
}

/** Store a checked icon and return its key. */
export async function saveIcon(
  bucket: R2Bucket,
  slug: string,
  check: Extract<IconCheck, { ok: true }>,
): Promise<string> {
  const key = `${ICON_PREFIX}${slug}-${Date.now().toString(36)}.${check.ext}`;

  await bucket.put(key, check.bytes, {
    httpMetadata: {
      contentType: check.contentType,
      cacheControl: "public, max-age=31536000, immutable",
    },
  });

  return key;
}

/** Remove an uploaded icon. Failures are logged, never thrown. */
export async function deleteIcon(
  bucket: R2Bucket | undefined,
  key: string | null | undefined,
): Promise<void> {
  if (!bucket || !isUploadedIcon(key)) {
    return;
  }

  try {
    await bucket.delete(key);
  } catch (err) {
    console.error("Failed to delete icon from R2:", err);
  }
}
