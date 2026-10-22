/**
 * Edge cache for public pages (Cloudflare Cache API).
 *
 * The home page is identical for every visitor, so it is rendered once per
 * data centre and then served from cache: no D1 queries, no HTML rendering.
 * - Fresh for FRESH_SECONDS, then served stale while it refreshes in the
 *   background (stale-while-revalidate).
 * - Any successful admin change purges the page in the data centre that handled
 *   it; other data centres catch up when their copy expires.
 */

const FRESH_SECONDS = 300;
const STALE_SECONDS = 3600;
const BROWSER_SECONDS = 60;

/** Pages that may be cached (public, same for everyone). */
const CACHEABLE_PATHS = new Set(["/"]);

type WaitUntil = (promise: Promise<unknown>) => void;

const cacheKey = (url: URL, path = url.pathname) =>
  new Request(`${url.origin}${path}`, { method: "GET" });

export const isCacheablePage = (request: Request, url: URL) =>
  request.method === "GET" && CACHEABLE_PATHS.has(url.pathname);

const defaultCache = () => (caches as unknown as { default: Cache }).default;

export async function readPageCache(url: URL): Promise<Response | null> {
  try {
    const hit = await defaultCache().match(cacheKey(url));
    if (!hit) return null;

    const age = Number(hit.headers.get("X-Cached-At") ?? 0);
    const response = new Response(hit.body, hit);
    response.headers.set("X-Cache", "HIT");
    response.headers.delete("X-Cached-At");
    response.headers.set(
      "Cache-Control",
      `public, max-age=${BROWSER_SECONDS}, s-maxage=${FRESH_SECONDS}`,
    );

    // Past the fresh window: still served, but the caller refreshes it.
    if (age && Date.now() - age > FRESH_SECONDS * 1000) {
      response.headers.set("X-Cache", "STALE");
    }
    return response;
  } catch {
    return null;
  }
}

export function storePage(url: URL, response: Response, waitUntil?: WaitUntil) {
  const isHtml = response.headers.get("Content-Type")?.includes("text/html");
  if (response.status !== 200 || !isHtml) return response;

  const stored = new Response(response.clone().body, response);
  stored.headers.delete("Set-Cookie");
  stored.headers.set(
    "Cache-Control",
    `public, max-age=${STALE_SECONDS + FRESH_SECONDS}`,
  );
  stored.headers.set("X-Cached-At", String(Date.now()));

  const put = defaultCache().put(cacheKey(url), stored).catch(() => {});
  waitUntil ? waitUntil(put) : void put;

  const out = new Response(response.body, response);
  out.headers.delete("Set-Cookie");
  out.headers.set(
    "Cache-Control",
    `public, max-age=${BROWSER_SECONDS}, s-maxage=${FRESH_SECONDS}`,
  );
  out.headers.set("X-Cache", "MISS");
  return out;
}

/** Drop the cached public pages (call after the content changed). */
export function purgePages(url: URL, waitUntil?: WaitUntil) {
  const jobs = Promise.all(
    [...CACHEABLE_PATHS].map((path) =>
      defaultCache().delete(cacheKey(url, path)).catch(() => false),
    ),
  );
  waitUntil ? waitUntil(jobs) : void jobs;
}
