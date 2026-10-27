import { getStationSights, getUnlinkedSights, linkSight, unlinkSight, type StationSight } from "../db/station-sights";
import { getStationExits } from "../db/station-exits";
import { readText } from "./common";

export interface SightsResult {
  redirectTo: string | null;
  sights: StationSight[];
  unlinked: { id: number; name: string; category: string }[];
  exits: { id: number; name: string }[];
  formError: string;
  errorFor: string;
  posted: Record<string, string> | null;
}

const text = (fd: FormData, key: string, max: number) => {
  const v = readText(fd, key);
  return { value: v || null, tooLong: v.length > max };
};

export async function handleSights(
  request: Request, db: D1Database, stationId: number, stationSlug: string,
): Promise<SightsResult> {
  const exits = (await getStationExits(db, stationId)).map((e) => ({ id: e.id, name: e.name }));
  const result: SightsResult = {
    redirectTo: null, sights: await getStationSights(db, stationId),
    unlinked: await getUnlinkedSights(db, stationId), exits, formError: "", errorFor: "", posted: null,
  };
  if (request.method !== "POST") return result;

  const fd = await request.formData();
  const action = readText(fd, "trip_action");
  const id = Number(readText(fd, "item_id"));
  const posted: Record<string, string> = { item_id: String(id || "") };
  for (const [k, v] of fd.entries()) if (typeof v === "string" && k !== "trip_action") posted[k] = v;
  const existing = result.sights.find((t) => t.top_pick_id === id);
  const fail = (scope: string, message: string) => {
    result.errorFor = scope; result.posted = posted; result.formError = message; return result;
  };

  try {
    if (action === "trip_delete") {
      if (existing) await unlinkSight(db, stationId, id); // the place stays in the Top picks list
    } else if (action === "trip_create" || action === "trip_update") {
      const scope = action === "trip_create" ? "thing-new" : `thing-${id}`;
      if (action === "trip_update" && !existing) return result;

      // Place details (name, photo, description...) live in Places; here only what is true for this station.
      const pickId = action === "trip_create" ? Number(readText(fd, "existing_id") || "0") : id;
      const order = Number(readText(fd, "sort_order") || "0");
      const exitId = Number(readText(fd, "exit_id") || "0") || null;
      const minRaw = readText(fd, "walking_minutes");
      const minutes = minRaw === "" ? null : Number(minRaw);
      const loc = text(fd, "location", 150), locJa = text(fd, "location_japanese", 150);
      const lt = readText(fd, "location_type"); const locType = lt === "outside" || lt === "inside_outside" ? lt : "inside";

      if (!(pickId > 0)) return fail(scope, "Choose a place from the list. Not there? Add it under Places first.");
      if (action === "trip_create" && !result.unlinked.some((u) => u.id === pickId)) {
        return fail(scope, "That place is not available (already on this station?). Choose another.");
      }
      if (!Number.isInteger(order) || order < 0) return fail(scope, "Order must be a whole number, 0 or more.");
      if (minutes !== null && (!Number.isInteger(minutes) || minutes < 0 || minutes > 120)) {
        return fail(scope, "Walking minutes must be a whole number from 0 to 120.");
      }
      if (loc.tooLong || locJa.tooLong) return fail(scope, "The location note must be 150 characters or less.");
      if (exitId && !exits.some((e) => e.id === exitId)) return fail(scope, "Please choose an exit of this station.");

      await linkSight(db, stationId, pickId, {
        exitId, walkingMinutes: minutes, locationType: locType,
        location: loc.value, locationJapanese: locJa.value, sortOrder: order,
      });
    } else {
      return result;
    }
    result.redirectTo = `/admin/stations/${stationId}/edit?g=top-picks#top-picks`;
  } catch (err) {
    console.error("Failed to save sights:", err);
    result.formError = "Unable to save. Please try again.";
  }
  return result;
}
