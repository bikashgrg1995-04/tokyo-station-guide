import {
  EXIT_PLACE_CATEGORIES,
  createExitPlace,
  deleteExitPlace,
  getExitPlaces,
  updateExitPlace,
  type ExitPlace,
  type ExitPlaceCategory,
} from "../db/station-exit-finder";
import { getStationExits } from "../db/station-exits";
import { readText } from "./common";

export interface StationExitPlacesResult {
  redirectTo: string | null;
  places: ExitPlace[];
  exits: { id: number; name: string; name_japanese: string | null; code: string | null; color_code: string | null }[];
  formError: string;
  /** "place-<id>" or "place-new" */
  errorFor: string;
  posted: Record<string, string> | null;
}

export async function handleStationExitPlaces(
  request: Request,
  db: D1Database,
  stationId: number,
): Promise<StationExitPlacesResult> {
  const exits = await getStationExits(db, stationId);
  const result: StationExitPlacesResult = {
    redirectTo: null,
    places: await getExitPlaces(db, stationId),
    exits: exits.map((e) => ({
      id: e.id,
      name: e.name,
      name_japanese: e.name_japanese ?? null,
      code: e.code ?? null,
      color_code: e.color_code ?? null,
    })),
    formError: "",
    errorFor: "",
    posted: null,
  };
  if (request.method !== "POST") return result;

  const fd = await request.formData();
  const action = readText(fd, "place_action");
  const id = Number(readText(fd, "item_id"));
  const posted: Record<string, string> = { item_id: String(id || "") };
  for (const [k, v] of fd.entries()) if (typeof v === "string" && k !== "place_action") posted[k] = v;
  const fail = (scope: string, message: string) => {
    result.errorFor = scope;
    result.formError = message;
    result.posted = posted;
    return result;
  };

  try {
    if (action === "place_create" || action === "place_update") {
      const scope = action === "place_create" ? "place-new" : `place-${id}`;
      const name = readText(fd, "name");
      const nameJa = readText(fd, "name_japanese") || null;
      const category = readText(fd, "category") as ExitPlaceCategory;
      const order = Number(readText(fd, "sort_order") || "0");
      if (!name) return fail(scope, "The name is required.");
      if (name.length > 150 || (nameJa ?? "").length > 150) return fail(scope, "A name must be 150 characters or less.");
      if (!EXIT_PLACE_CATEGORIES.includes(category)) return fail(scope, "Choose a category.");
      if (!Number.isInteger(order) || order < 0) return fail(scope, "Order must be a whole number, 0 or more.");

      const linked: { exitId: number; note: string | null; noteJapanese: string | null }[] = [];
      for (const e of exits) {
        if (!readText(fd, `exit_${e.id}`)) continue;
        const note = readText(fd, `note_${e.id}`) || null;
        const noteJa = readText(fd, `note_japanese_${e.id}`) || null;
        if ((note ?? "").length > 120 || (noteJa ?? "").length > 120) return fail(scope, "A note must be 120 characters or less.");
        linked.push({ exitId: e.id, note, noteJapanese: noteJa });
      }
      if (linked.length === 0) return fail(scope, "Tick at least one exit for this place.");

      const input = { name, nameJapanese: nameJa, category, sortOrder: order, exits: linked };
      if (action === "place_create") await createExitPlace(db, stationId, input);
      else if (result.places.some((p) => p.id === id)) await updateExitPlace(db, stationId, id, input);
    } else if (action === "place_delete") {
      if (result.places.some((p) => p.id === id)) await deleteExitPlace(db, stationId, id);
    } else {
      return result;
    }
    result.redirectTo = `/admin/stations/${stationId}/edit#exit`;
  } catch (err) {
    console.error("Failed to save exit places:", err);
    result.formError = "Unable to save. Please try again.";
  }
  return result;
}
