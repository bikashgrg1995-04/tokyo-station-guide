import type { APIRoute } from "astro";
import { ICON_PREFIX, iconBucket } from "../../lib/storage/facility-icons";
import { TOP_PICK_IMAGE_PREFIX } from "../../lib/storage/top-pick-images";

export const prerender = false;

/*
 * Public read access to uploaded facility icons and top pick images only.
 * Anything outside those prefixes is a 404.
 */
export const GET: APIRoute = async ({ params, request }) => {
  const { env } = await import("cloudflare:workers");
  const key = params.key ?? "";
  const bucket = iconBucket(env);

  if (
    !bucket ||
    !(key.startsWith(ICON_PREFIX) || key.startsWith(TOP_PICK_IMAGE_PREFIX)) ||
    key.includes("..")
  ) {
    return new Response("Not found", { status: 404 });
  }

  const object = await bucket.get(key);

  if (!object) {
    return new Response("Not found", { status: 404 });
  }

  const etag = object.httpEtag;

  const headers = new Headers({
    "Content-Type": object.httpMetadata?.contentType ?? "application/octet-stream",
    "Cache-Control": "public, max-age=31536000, immutable",
    ETag: etag,
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy":
      "default-src 'none'; style-src 'unsafe-inline'; sandbox",
  });

  if (request.headers.get("If-None-Match") === etag) {
    return new Response(null, { status: 304, headers });
  }

  return new Response(object.body, { headers });
};
