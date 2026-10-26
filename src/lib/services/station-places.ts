import {
  assignPlace, getAllPlaces, getStationPlaces, unassignPlace,
  type PlaceKindInfo, type StationPlace,
} from "../db/places";
import { getStationExits } from "../db/station-exits";
import { readText } from "./common";

export interface StationPlacesResult {
  redirectTo: string | null;
  items: StationPlace[];
  choices: { id: number; name: string }[];
  exits: { id: number; name: string }[];
  formError: string;
  errorFor: string;
  posted: Record<string, string> | null;
}

/** Hotels / restaurants of one station: choose an existing place, then its exit, walking minutes and note. */
export async function handleStationPlaces(
  request: Request, db: D1Database, stationId: number, k: PlaceKindInfo,
): Promise<StationPlacesResult> {
  const items = await getStationPlaces(db, k, stationId);
  const taken = new Set(items.map((i) => i.place_id));
  const result: StationPlacesResult = {
    redirectTo: null, items,
    choices: (await getAllPlaces(db, k)).filter((p) => !taken.has(p.id)).map((p) => ({ id: p.id, name: p.name })),
    exits: (await getStationExits(db, stationId)).map((e) => ({ id: e.id, name: e.name })),
    formError: "", errorFor: "", posted: null,
  };
  if (request.method !== "POST") return result;

  const fd = await request.formData();
  const action = readText(fd, "place_action");
  const posted: Record<string, string> = {};
  for (const [key, v] of fd.entries()) if (typeof v === "string" && key !== "place_action") posted[key] = v;
  const fail = (scope: string, m: string) => { result.errorFor = scope; result.posted = posted; result.formError = m; return result; };

  try {
    if (action === "place_delete") {
      const id = Number(readText(fd, "item_id"));
      if (taken.has(id)) await unassignPlace(db, k, stationId, id);
    } else if (action === "place_create" || action === "place_update") {
      const isNew = action === "place_create";
      const scope = isNew ? "place-new" : "place-edit";
      const id = Number(readText(fd, isNew ? "existing_id" : "item_id"));
      if (!Number.isInteger(id) || id <= 0) return fail(scope, `Choose a ${k.label.toLowerCase()}.`);
      if (isNew ? taken.has(id) : !taken.has(id)) return fail(scope, "That place is not available here.");
      if (isNew && !result.choices.some((c) => c.id === id)) return fail(scope, `Choose a ${k.label.toLowerCase()}.`);
      const exitId = Number(readText(fd, "exit_id") || "0") || null;
      const minRaw = readText(fd, "walking_minutes");
      const minutes = minRaw === "" ? null : Number(minRaw);
      const order = Number(readText(fd, "sort_order") || "0");
      const loc = readText(fd, "location"), locJa = readText(fd, "location_japanese");
      if (exitId && !result.exits.some((e) => e.id === exitId)) return fail(scope, "Please choose an exit of this station.");
      if (minutes !== null && (!Number.isInteger(minutes) || minutes < 0 || minutes > 120)) return fail(scope, "Walking minutes must be a whole number from 0 to 120.");
      if (!Number.isInteger(order) || order < 0) return fail(scope, "Order must be a whole number, 0 or more.");
      if (loc.length > 200 || locJa.length > 200) return fail(scope, "The note must be 200 characters or less.");
      await assignPlace(db, k, stationId, id, {
        location: loc || null, locationJapanese: locJa || null, sortOrder: order, exitId, walkingMinutes: minutes,
      });
    } else {
      return result;
    }
    result.redirectTo = `/admin/stations/${stationId}/edit#${k.route}`;
  } catch (err) {
    console.error("Failed to save station places:", err);
    result.formError = "Unable to save. Please try again.";
  }
  return result;
}
