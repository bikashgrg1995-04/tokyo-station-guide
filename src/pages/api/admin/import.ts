import type { APIRoute } from "astro";
import { applyImportOps, loadImportSnapshot } from "../../../lib/db/bulk-import";
import type { RawSheets } from "../../../lib/import/sheets";
import { buildImportPlan } from "../../../lib/services/bulk-import";

export const prerender = false;

const MAX_BODY_BYTES = 6 * 1024 * 1024;

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

/** Accepts only { sheet name: [[cell, ...], ...] } with plain text / number cells. */
function parseSheets(value: unknown): RawSheets | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const sheets: RawSheets = {};
  for (const [name, rows] of Object.entries(value as Record<string, unknown>)) {
    if (!Array.isArray(rows)) return null;
    sheets[name] = rows.map((row) =>
      Array.isArray(row)
        ? row.map((cell) =>
            typeof cell === "string" || typeof cell === "number" ? String(cell) : "",
          )
        : [],
    );
  }
  return sheets;
}

/**
 * POST { mode: "preview" | "apply", sheets, deleteMissing }
 * Both modes check the file against the database. "apply" repeats that check
 * (the browser's preview is never trusted) and then saves everything at once.
 */
export const POST: APIRoute = async ({ request, session, url }) => {
  const admin = await session?.get("admin");

  if (!admin) {
    return json({ ok: false, message: "Unauthorized." }, 401);
  }

  const origin = request.headers.get("origin");
  if (origin && origin !== url.origin) {
    return json({ ok: false, message: "Forbidden." }, 403);
  }

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) {
    return json({ ok: false, message: "The file is too large." }, 413);
  }

  let body: { mode?: unknown; sheets?: unknown; deleteMissing?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: "Invalid request." }, 400);
  }

  const sheets = parseSheets(body.sheets);
  if (!sheets || (body.mode !== "preview" && body.mode !== "apply")) {
    return json({ ok: false, message: "Invalid request." }, 400);
  }

  const { env } = await import("cloudflare:workers");

  try {
    const plan = buildImportPlan(sheets, await loadImportSnapshot(env.DB), {
      deleteMissing: body.deleteMissing === true,
    });

    if (body.mode === "preview" || !plan.preview.ok) {
      return json({ ok: true, applied: false, preview: plan.preview });
    }

    await applyImportOps(env.DB, plan.ops);
    return json({ ok: true, applied: true, preview: plan.preview });
  } catch (error) {
    console.error("Bulk import failed:", error);
    return json(
      { ok: false, message: "The import failed and nothing was saved. Please try again." },
      500,
    );
  }
};
