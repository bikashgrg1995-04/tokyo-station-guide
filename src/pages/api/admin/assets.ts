
import type { APIRoute } from "astro";

export const prerender = false;

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);

const ALLOWED_CATEGORIES = new Set([
  "facilities",
  "top-picks",
  "stations",
  "general",
]);

function json(
  body: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function validateSvg(svg: string): boolean {
  // Reject active or externally referenced SVG content.
  const forbidden = [
    /<!DOCTYPE/i,
    /<!ENTITY/i,
    /<script\b/i,
    /<foreignObject\b/i,
    /\bon[a-z]+\s*=/i,
    /javascript\s*:/i,
    /url\s*\(/i,
    /@import/i,
  ];

  if (!/<svg(?:\s|>)/i.test(svg)) {
    return false;
  }

  return !forbidden.some((pattern) => pattern.test(svg));
}

async function validateImage(
  file: File,
): Promise<{ bytes: ArrayBuffer; contentType: string } | null> {
  const bytes = await file.arrayBuffer();
  const data = new Uint8Array(bytes);

  if (file.type === "image/svg+xml") {
    const svg = new TextDecoder().decode(bytes);

    if (!validateSvg(svg)) {
      return null;
    }

    return { bytes, contentType: "image/svg+xml" };
  }

  // Check file signatures instead of trusting the browser MIME type.
  const isPng =
    data.length >= 8 &&
    data[0] === 0x89 &&
    data[1] === 0x50 &&
    data[2] === 0x4e &&
    data[3] === 0x47 &&
    data[4] === 0x0d &&
    data[5] === 0x0a &&
    data[6] === 0x1a &&
    data[7] === 0x0a;

  const isJpeg =
    data.length >= 3 &&
    data[0] === 0xff &&
    data[1] === 0xd8 &&
    data[2] === 0xff;

  const isWebp =
    data.length >= 12 &&
    String.fromCharCode(...data.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...data.slice(8, 12)) === "WEBP";

  if (file.type === "image/png" && isPng) {
    return { bytes, contentType: "image/png" };
  }

  if (file.type === "image/jpeg" && isJpeg) {
    return { bytes, contentType: "image/jpeg" };
  }

  if (file.type === "image/webp" && isWebp) {
    return { bytes, contentType: "image/webp" };
  }

  return null;
}

export const POST: APIRoute = async ({ request, session }) => {
  const admin = await session?.get("admin");

  if (!admin) {
    return json({ ok: false, message: "Unauthorized." }, 401);
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);

  if (contentLength > MAX_FILE_SIZE + 64 * 1024) {
    return json({ ok: false, message: "File is too large. Maximum size is 5 MB." }, 413);
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return json({ ok: false, message: "Invalid multipart form data." }, 400);
  }

  const file = formData.get("file");
  const category = formData.get("category");

  if (!(file instanceof File) || file.size === 0) {
    return json({ ok: false, message: "Please select an image file." }, 400);
  }

  if (file.size > MAX_FILE_SIZE) {
    return json({ ok: false, message: "File is too large. Maximum size is 5 MB." }, 413);
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return json({
      ok: false,
      message: "Supported formats are PNG, JPEG, WebP and SVG.",
    }, 415);
  }

  if (typeof category !== "string" || !ALLOWED_CATEGORIES.has(category)) {
    return json({ ok: false, message: "Invalid asset category." }, 400);
  }

  const validated = await validateImage(file);

  if (!validated) {
    return json({
      ok: false,
      message: "The image is invalid or contains unsupported SVG content.",
    }, 400);
  }

  const extensionByType: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/svg+xml": "svg",
  };

  const objectKey =
    `${category}/${crypto.randomUUID()}.${extensionByType[validated.contentType]}`;

  try {
    const { env } = await import("cloudflare:workers");

    await env.ASSETS_BUCKET.put(objectKey, validated.bytes, {
      httpMetadata: {
        contentType: validated.contentType,
        contentDisposition: "inline",
      },
      customMetadata: {
        originalName: file.name.slice(0, 200),
      },
    });

    return json({
      ok: true,
      message: "Asset uploaded successfully.",
      objectKey,
      contentType: validated.contentType,
      size: file.size,
    }, 201);
  } catch (error) {
    console.error("R2 asset upload failed:", error);

    return json({
      ok: false,
      message: "Could not upload the asset.",
    }, 500);
  }
};
