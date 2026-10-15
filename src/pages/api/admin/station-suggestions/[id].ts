import type { APIRoute } from "astro";
import {
  deleteStationSuggestion,
  getStationSuggestionById,
  setStationSuggestionStatus,
  type StationSuggestionStatus,
} from "../../../../lib/db/station-suggestions";

export const prerender = false;

/**
 * Suggestions are read and handled by an admin by hand, so these actions
 * only change the status. They never edit the station.
 */
type ReviewAction = "resolve" | "dismiss" | "reopen";

const ACTION_STATUS: Record<ReviewAction, StationSuggestionStatus> = {
  resolve: "approved",
  dismiss: "rejected",
  reopen: "pending",
};

const ACTION_MESSAGE: Record<ReviewAction, string> = {
  resolve: "Marked as resolved.",
  dismiss: "Suggestion dismissed.",
  reopen: "Suggestion reopened.",
};

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function getId(value: string | undefined): number | null {
  if (!value || !/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

export const GET: APIRoute = async ({ params, session }) => {
  const admin = await session?.get("admin");

  if (!admin) {
    return json({ ok: false, message: "Unauthorized." }, 401);
  }

  const id = getId(params.id);

  if (!id) {
    return json({ ok: false, message: "Invalid suggestion ID." }, 400);
  }

  const { env } = await import("cloudflare:workers");

  const suggestion = await getStationSuggestionById(env.DB, id);

  if (!suggestion) {
    return json({ ok: false, message: "Suggestion not found." }, 404);
  }

  return json({ ok: true, suggestion });
};

export const PATCH: APIRoute = async ({ params, request, session }) => {
  const admin = await session?.get("admin");

  if (!admin) {
    return json({ ok: false, message: "Unauthorized." }, 401);
  }

  const id = getId(params.id);

  if (!id) {
    return json({ ok: false, message: "Invalid suggestion ID." }, 400);
  }

  let body: { action?: string };

  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: "Invalid JSON body." }, 400);
  }

  const action = body.action as ReviewAction | undefined;

  if (!action || !(action in ACTION_STATUS)) {
    return json(
      { ok: false, message: "Action must be resolve, dismiss or reopen." },
      400,
    );
  }

  const { env } = await import("cloudflare:workers");

  const status = ACTION_STATUS[action];
  const updated = await setStationSuggestionStatus(env.DB, id, status);

  if (!updated) {
    return json({ ok: false, message: "Suggestion not found." }, 404);
  }

  return json({ ok: true, message: ACTION_MESSAGE[action], status });
};

export const DELETE: APIRoute = async ({ params, session }) => {
  const admin = await session?.get("admin");

  if (!admin) {
    return json({ ok: false, message: "Unauthorized." }, 401);
  }

  const id = getId(params.id);

  if (!id) {
    return json({ ok: false, message: "Invalid suggestion ID." }, 400);
  }

  const { env } = await import("cloudflare:workers");

  const deleted = await deleteStationSuggestion(env.DB, id);

  if (!deleted) {
    return json({ ok: false, message: "Suggestion not found." }, 404);
  }

  return json({ ok: true, message: "Suggestion deleted." });
};
