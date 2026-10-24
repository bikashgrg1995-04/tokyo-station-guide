import {
  createStationRoute,
  deleteStationRoute,
  getRoutesNote,
  getStationRoutes,
  saveRoutesNote,
  updateStationRoute,
  type StationRoute,
  type StationRouteInput,
} from "../db/station-routes";
import { readText } from "./common";

export interface StationRoutesResult {
  redirectTo: string | null;
  routes: StationRoute[];
  note: string;
  noteJapanese: string;
  formError: string;
  /** Which form the error belongs to: a route id, "new" or "note". */
  errorFor: string;
}

function readInput(formData: FormData): { input: StationRouteInput; error: string } {
  const t = (key: string) => readText(formData, key) || null;
  const input: StationRouteInput = {
    fromPlace: readText(formData, "from_place"),
    fromPlaceJapanese: t("from_place_japanese"),
    route: t("route"),
    routeJapanese: t("route_japanese"),
    travelTime: t("travel_time"),
    travelTimeJapanese: t("travel_time_japanese"),
    cost: t("cost"),
    costJapanese: t("cost_japanese"),
    sortOrder: Number(readText(formData, "sort_order") || "0"),
  };
  const long = (v: string | null, max: number) => (v ?? "").length > max;
  let error = "";
  if (!input.fromPlace) error = "\"From\" is required.";
  else if (long(input.fromPlace, 80) || long(input.fromPlaceJapanese, 80)) error = "\"From\" must be 80 characters or less.";
  else if (long(input.route, 500) || long(input.routeJapanese, 500)) error = "Route must be 500 characters or less.";
  else if (long(input.travelTime, 60) || long(input.travelTimeJapanese, 60)) error = "Time must be 60 characters or less.";
  else if (long(input.cost, 120) || long(input.costJapanese, 120)) error = "Cost must be 120 characters or less.";
  else if (!Number.isInteger(input.sortOrder) || input.sortOrder < 0) error = "Order must be a whole number, 0 or more.";
  return { input, error };
}

export async function handleStationRoutes(
  request: Request,
  db: D1Database,
  stationId: number,
): Promise<StationRoutesResult> {
  const result: StationRoutesResult = {
    redirectTo: null,
    routes: await getStationRoutes(db, stationId),
    ...(await getRoutesNote(db, stationId)),
    formError: "",
    errorFor: "",
  };
  if (request.method !== "POST") return result;

  const formData = await request.formData();
  const action = readText(formData, "route_action");
  const id = Number(readText(formData, "route_id"));
  const owned = result.routes.some((r) => r.id === id);

  try {
    if (action === "save_note") {
      const note = readText(formData, "routes_note");
      const noteJa = readText(formData, "routes_note_japanese");
      if (note.length > 1000 || noteJa.length > 1000) {
        result.formError = "The note must be 1000 characters or less.";
        result.errorFor = "note";
        return result;
      }
      await saveRoutesNote(db, stationId, note || null, noteJa || null);
    } else if (action === "create" || action === "update") {
      const { input, error } = readInput(formData);
      if (error) {
        result.formError = error;
        result.errorFor = action === "create" ? "new" : String(id);
        return result;
      }
      if (action === "create") await createStationRoute(db, stationId, input);
      else if (owned) await updateStationRoute(db, stationId, id, input);
    } else if (action === "delete") {
      if (owned) await deleteStationRoute(db, stationId, id);
    } else {
      return result;
    }
    result.redirectTo = `/admin/stations/${stationId}/routes#saved`;
  } catch (err) {
    console.error("Failed to save station routes:", err);
    result.formError = "Unable to save. Please try again.";
  }
  return result;
}
