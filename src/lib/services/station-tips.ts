import {
  createStationTip,
  deleteStationTip,
  getExitsNote,
  getStationTips,
  saveExitsNote,
  updateStationTip,
  type StationTip,
} from "../db/station-tips";
import { readText } from "./common";

export interface StationTipsResult {
  redirectTo: string | null;
  tips: StationTip[];
  note: string;
  noteJapanese: string;
  formError: string;
  /** Which form the error belongs to: "photo-<id>", "tip-<id>", "tip-new" or "note". */
  errorFor: string;
  posted: Record<string, string> | null;
}

const text = (fd: FormData, key: string) => readText(fd, key) || null;
const tooLong = (v: string | null, max: number) => (v ?? "").length > max;

export async function handleStationTips(
  request: Request,
  db: D1Database,
  stationId: number,
): Promise<StationTipsResult> {
  const result: StationTipsResult = {
    redirectTo: null,
    tips: await getStationTips(db, stationId),
    ...(await getExitsNote(db, stationId)),
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
    if (scope !== "note") result.posted = posted;
    result.formError = message;
    return result;
  };
  const order = Number(readText(fd, "sort_order") || "0");
  const orderOk = Number.isInteger(order) && order >= 0;

  try {
    if (action === "save_note") {
      const note = readText(fd, "exits_note");
      const noteJa = readText(fd, "exits_note_japanese");
      if (note.length > 1000 || noteJa.length > 1000) return fail("note", "The note must be 1000 characters or less.");
      await saveExitsNote(db, stationId, note || null, noteJa || null);
    } else if (action === "tip_create" || action === "tip_update") {
      const tip = readText(fd, "tip");
      const tipJa = text(fd, "tip_japanese");
      const scope = action === "tip_create" ? "tip-new" : `tip-${id}`;
      if (!tip) return fail(scope, "The tip text is required.");
      if (tip.length > 600 || tooLong(tipJa, 600)) return fail(scope, "A tip must be 600 characters or less.");
      if (!orderOk) return fail(scope, "Order must be a whole number, 0 or more.");
      const input = { tip, tipJapanese: tipJa, sortOrder: order };
      if (action === "tip_create") await createStationTip(db, stationId, input);
      else if (result.tips.some((t) => t.id === id)) await updateStationTip(db, stationId, id, input);
    } else if (action === "tip_delete") {
      if (result.tips.some((t) => t.id === id)) await deleteStationTip(db, stationId, id);
    } else {
      return result;
    }
    result.redirectTo = `/admin/stations/${stationId}/exits#tips`;
  } catch (err) {
    console.error("Failed to save station tips:", err);
    result.formError = "Unable to save. Please try again.";
  }
  return result;
}
