
import type { APIRoute } from "astro";

export const prerender = false;

const ALLOWED_CATEGORIES = new Set([
  "facilities",
  "top-picks",
  "stations",
  "general",
]);

const ALLOWED_CONTENT_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);

export const GET: APIRoute = async ({ params, request, locals }) => {
  const key = params.key;

  if (
    !key ||
    key.length > 300 ||
    key.startsWith("/") ||
    key.includes("\\") ||
    key.split("/").length !== 2
  ) {
    return new Response("Not found", { status: 404 });
  }

  const [category, filename] = key.split("/");

  if (
    !ALLOWED_CATEGORIES.has(category) ||
    !/^[a-f0-9-]+\.(png|jpg|webp|svg)$/i.test(filename)
  ) {
    return new Response("Not found", { status: 404 });
  }

  // Image names are random ids and never reused, so a cached copy never goes
  // stale: answer from the edge cache before touching R2.
  const cache = (caches as unknown as { default: Cache }).default;
  const cacheKey = new Request(new URL(request.url).origin + "/api/assets/" + key);
  const hit = await cache.match(cacheKey).catch(() => undefined);
  if (hit) return hit;

  try {
    const { env } = await import("cloudflare:workers");
    const object = await env.ASSETS_BUCKET.get(key);

    if (!object) {
      return new Response("Not found", { status: 404 });
    }

    const contentType =
      object.httpMetadata?.contentType ?? "application/octet-stream";

    if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
      return new Response("Unsupported asset type", { status: 415 });
    }

    const headers = new Headers({
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=31536000, immutable",
    });

    // SVG must not be able to run scripts or load external resources.
    if (contentType === "image/svg+xml") {
      headers.set(
        "Content-Security-Policy",
        "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      );
    }

    const response = new Response(object.body, { headers });
    locals.cfContext?.waitUntil(
      cache.put(cacheKey, response.clone()).catch(() => {}),
    );
    return response;
  } catch (error) {
    console.error("R2 asset retrieval failed:", error);

    return new Response("Asset service unavailable", { status: 500 });
  }
};
