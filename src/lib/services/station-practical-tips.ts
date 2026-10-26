import {
  createPracticalTip,
  deletePracticalTip,
  getPracticalTips,
  updatePracticalTip,
  type PracticalTip,
} from "../db/station-practical-tips";
import { readText } from "./common";

export interface PracticalTipsResult {
  redirectTo: string | null;
  tips: PracticalTip[];
  formError: string;
  /** "tip-<id>" or "tip-new" */
  errorFor: string;
  posted: Record<string, string> | null;
}

export async function handlePracticalTips(
  request: Request,
  db: D1Database,
  stationId: number,
): Promise<PracticalTipsResult> {
  const result: PracticalTipsResult = {
    redirectTo: null,
    tips: await getPracticalTips(db, stationId),
    formError: "",
    errorFor: "",
    posted: null,
  };
  if (request.method !== "POST") return result;

  const fd = await request.formData();
  const action = readText(fd, "tips_action");
  const id = Number(readText(fd, "item_id"));
  const posted: Record<string, string> = { item_id: String(id || "") };
  for (const [k, v] of fd.entries()) if (typeof v === "string" && k !== "tips_action") posted[k] = v;
  const fail = (scope: string, message: string) => {
    result.errorFor = scope;
    result.posted = posted;
    result.formError = message;
    return result;
  };

  try {
    if (action === "tip_create" || action === "tip_update") {
      const tip = readText(fd, "tip");
      const tipJa = readText(fd, "tip_japanese") || null;
      const order = Number(readText(fd, "sort_order") || "0");
      const scope = action === "tip_create" ? "tip-new" : `tip-${id}`;
      if (!tip) return fail(scope, "The tip text is required.");
      if (tip.length > 800 || (tipJa ?? "").length > 800) return fail(scope, "A tip must be 800 characters or less.");
      if (!Number.isInteger(order) || order < 0) return fail(scope, "Order must be a whole number, 0 or more.");
      const input = { tip, tipJapanese: tipJa, sortOrder: order };
      if (action === "tip_create") await createPracticalTip(db, stationId, input);
      else if (result.tips.some((t) => t.id === id)) await updatePracticalTip(db, stationId, id, input);
    } else if (action === "tip_delete") {
      if (result.tips.some((t) => t.id === id)) await deletePracticalTip(db, stationId, id);
    } else {
      return result;
    }
    result.redirectTo = `/admin/stations/${stationId}/practical-tips#saved`;
  } catch (err) {
    console.error("Failed to save practical tips:", err);
    result.formError = "Unable to save. Please try again.";
  }
  return result;
}
