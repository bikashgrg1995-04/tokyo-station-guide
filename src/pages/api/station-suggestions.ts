
import type { APIRoute } from "astro";
import { handleStationSuggestion } from "../../lib/services/station-suggestions";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const { env } = await import("cloudflare:workers");

  const result = await handleStationSuggestion(request, env.DB);

  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
};
