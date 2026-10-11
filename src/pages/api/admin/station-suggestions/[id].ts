
import type { APIRoute } from "astro";
import { getStationSuggestionById } from "../../../../lib/db/station-suggestions";

export const prerender = false;

type ReviewAction = "accept" | "reject";

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

function getId(value: string | undefined): number | null {
  if (!value || !/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

export const GET: APIRoute = async ({
  params,
  session,
}) => {
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

  const station = await env.DB.prepare(`
    SELECT
      id,
      name,
      name_japanese,
      slug,
      latitude,
      longitude,
      description,
      about,
      updated_at
    FROM stations
    WHERE id = ?
    LIMIT 1
  `)
    .bind(suggestion.station_id)
    .first();

  if (!station) {
    return json({ ok: false, message: "Station not found." }, 404);
  }

  return json({
    ok: true,
    suggestion,
    station,
  });
};

export const PATCH: APIRoute = async ({
  params,
  request,
  session,
}) => {
  const admin = await session?.get("admin");

  if (!admin) {
    return json({ ok: false, message: "Unauthorized." }, 401);
  }

  const id = getId(params.id);

  if (!id) {
    return json({ ok: false, message: "Invalid suggestion ID." }, 400);
  }

  let body: { action?: ReviewAction };

  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: "Invalid JSON body." }, 400);
  }

  if (body.action !== "accept" && body.action !== "reject") {
    return json(
      { ok: false, message: "Action must be accept or reject." },
      400,
    );
  }

  const { env } = await import("cloudflare:workers");
  const db = env.DB;

  const suggestion = await getStationSuggestionById(db, id);

  if (!suggestion) {
    return json({ ok: false, message: "Suggestion not found." }, 404);
  }

  if (suggestion.status !== "pending") {
    return json(
      {
        ok: false,
        message: `This suggestion has already been ${suggestion.status}.`,
      },
      409,
    );
  }

  if (body.action === "reject") {
    const result = await db.prepare(`
      UPDATE station_suggestions
      SET
        status = 'rejected',
        reviewed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND status = 'pending'
    `)
      .bind(id)
      .run();

    if (result.meta.changes !== 1) {
      return json(
        { ok: false, message: "Suggestion was already reviewed." },
        409,
      );
    }

    return json({
      ok: true,
      message: "Suggestion rejected.",
      status: "rejected",
    });
  }

  /*
   * Only update fields actually included in the suggestion.
   * Null values mean that the visitor did not propose a change.
   *
   * Deliberately leave slug and relational data untouched.
   * Slug generation and relation suggestions need their own
   * validation before they can safely be applied.
   */
  const updates: Array<{ column: string; value: string | number }> = [];

  if (suggestion.suggested_name !== null) {
    updates.push({
      column: "name",
      value: suggestion.suggested_name,
    });
  }

  if (suggestion.suggested_name_japanese !== null) {
    updates.push({
      column: "name_japanese",
      value: suggestion.suggested_name_japanese,
    });
  }

  if (suggestion.suggested_description !== null) {
    updates.push({
      column: "description",
      value: suggestion.suggested_description,
    });
  }

  if (suggestion.suggested_about !== null) {
    updates.push({
      column: "about",
      value: suggestion.suggested_about,
    });
  }

  if (suggestion.suggested_latitude !== null) {
    updates.push({
      column: "latitude",
      value: suggestion.suggested_latitude,
    });
  }

  if (suggestion.suggested_longitude !== null) {
    updates.push({
      column: "longitude",
      value: suggestion.suggested_longitude,
    });
  }

  const statements = [];

  if (updates.length > 0) {
    const setClause = updates
      .map(({ column }) => `${column} = ?`)
      .join(", ");

    statements.push(
      db.prepare(`
        UPDATE stations
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(
        ...updates.map(({ value }) => value),
        suggestion.station_id,
      ),
    );
  }

  statements.push(
    db.prepare(`
      UPDATE station_suggestions
      SET
        status = 'approved',
        reviewed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND status = 'pending'
    `).bind(id),
  );

  try {
    await db.batch(statements);
  } catch {
    return json(
      { ok: false, message: "Could not apply the suggestion." },
      500,
    );
  }

  const reviewed = await db.prepare(`
    SELECT status
    FROM station_suggestions
    WHERE id = ?
    LIMIT 1
  `)
    .bind(id)
    .first<{ status: string }>();

  if (reviewed?.status !== "approved") {
    return json(
      { ok: false, message: "Suggestion was already reviewed." },
      409,
    );
  }

  return json({
    ok: true,
    message: "Suggestion accepted.",
    status: "approved",
    updatedFields: updates.map(({ column }) => column),
  });
};

export const DELETE: APIRoute = async ({
  params,
  session,
}) => {
  const admin = await session?.get("admin");

  if (!admin) {
    return json({ ok: false, message: "Unauthorized." }, 401);
  }

  const id = getId(params.id);

  if (!id) {
    return json({ ok: false, message: "Invalid suggestion ID." }, 400);
  }

  const { env } = await import("cloudflare:workers");

  const result = await env.DB.prepare(`
    DELETE FROM station_suggestions
    WHERE id = ?
  `)
    .bind(id)
    .run();

  if (result.meta.changes !== 1) {
    return json({ ok: false, message: "Suggestion not found." }, 404);
  }

  return json({
    ok: true,
    message: "Suggestion deleted.",
  });
};
