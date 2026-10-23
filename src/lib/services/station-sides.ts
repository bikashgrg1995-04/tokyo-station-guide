import {
  createStationSide,
  deleteStationSide,
  getSidesNote,
  getStationSides,
  saveSidesNote,
  updateStationSide,
  type StationSide,
  type StationSideInput,
} from "../db/station-sides";
import { readText } from "./common";

export interface StationSidesResult {
  redirectTo: string | null;
  sides: StationSide[];
  note: string;
  noteJapanese: string;
  formError: string;
  /** Which form the error belongs to: a side id, "new" or "note". */
  errorFor: string;
}

function readInput(formData: FormData): { input: StationSideInput; error: string } {
  const input: StationSideInput = {
    name: readText(formData, "name"),
    nameJapanese: readText(formData, "name_japanese") || null,
    subtitle: readText(formData, "subtitle") || null,
    subtitleJapanese: readText(formData, "subtitle_japanese") || null,
    description: readText(formData, "description") || null,
    descriptionJapanese: readText(formData, "description_japanese") || null,
    sortOrder: Number(readText(formData, "sort_order") || "0"),
  };
  let error = "";
  if (!input.name) error = "Name is required.";
  else if (input.name.length > 80) error = "Name must be 80 characters or less.";
  else if ((input.subtitle ?? "").length > 120 || (input.subtitleJapanese ?? "").length > 120)
    error = "Subtitle must be 120 characters or less.";
  else if ((input.description ?? "").length > 1500 || (input.descriptionJapanese ?? "").length > 1500)
    error = "Description must be 1500 characters or less.";
  else if (!Number.isInteger(input.sortOrder) || input.sortOrder < 0)
    error = "Order must be a whole number, 0 or more.";
  return { input, error };
}

export async function handleStationSides(
  request: Request,
  db: D1Database,
  stationId: number,
): Promise<StationSidesResult> {
  const here = `/admin/stations/${stationId}/sides`;
  const result: StationSidesResult = {
    redirectTo: null,
    sides: await getStationSides(db, stationId),
    ...(await getSidesNote(db, stationId)),
    formError: "",
    errorFor: "",
  };
  if (request.method !== "POST") return result;

  const formData = await request.formData();
  const action = readText(formData, "side_action");
  const id = Number(readText(formData, "side_id"));
  const owned = result.sides.some((s) => s.id === id);

  try {
    if (action === "save_note") {
      const note = readText(formData, "sides_note");
      const noteJa = readText(formData, "sides_note_japanese");
      if (note.length > 1500 || noteJa.length > 1500) {
        result.formError = "The note must be 1500 characters or less.";
        result.errorFor = "note";
        return result;
      }
      await saveSidesNote(db, stationId, note || null, noteJa || null);
    } else if (action === "create" || action === "update") {
      const { input, error } = readInput(formData);
      if (error) {
        result.formError = error;
        result.errorFor = action === "create" ? "new" : String(id);
        return result;
      }
      if (action === "create") await createStationSide(db, stationId, input);
      else if (owned) await updateStationSide(db, stationId, id, input);
    } else if (action === "delete") {
      if (owned) await deleteStationSide(db, stationId, id);
    } else {
      return result;
    }
    result.redirectTo = `${here}#saved`;
  } catch (err) {
    console.error("Failed to save station sides:", err);
    result.formError = "Unable to save. Please try again.";
  }
  return result;
}
