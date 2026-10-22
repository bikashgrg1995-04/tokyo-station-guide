import {
  createStationExit,
  deleteStationExit,
  deleteStationExits,
  getStationExits,
  updateStationExit,
  type StationExit,
  type StationExitInput,
} from "../db/station-exits";

import { getStationFloors, type StationFloor } from "../db/station-floors";

import { hasErrors, readText } from "./common";

import {
  emptyStationExitErrors,
  validateStationExitForm,
  type StationExitFormErrors,
  type StationExitFormValues,
} from "../validators/station-exit";

export interface StationExitFormResult {
  redirectTo: string | null;
  exits: StationExit[];
  floors: StationFloor[];
  values: StationExitFormValues;
  errors: StationExitFormErrors;
  formError: string;
  editingId: number | null;
  /** Suggested sort order for the next new exit. */
  nextSortOrder: number;
}

function nextSortOrderFor(exits: StationExit[]): number {
  return exits.reduce((max, exit) => Math.max(max, exit.sort_order), 0) + 1;
}

function emptyValues(nextSortOrder: number): StationExitFormValues {
  return {
    floorId: "",
    name: "",
    nameJapanese: "",
    code: "",
    colorCode: "",
    description: "",
    descriptionJapanese: "",
    sortOrder: String(nextSortOrder),
  };
}

function readExitForm(formData: FormData): StationExitFormValues {
  return {
    floorId: readText(formData, "floor_id"),
    name: readText(formData, "name"),
    nameJapanese: readText(formData, "name_japanese"),
    code: readText(formData, "code"),
    colorCode: readText(formData, "color_code").toUpperCase(),
    description: readText(formData, "description"),
    descriptionJapanese: readText(formData, "description_japanese"),
    sortOrder: readText(formData, "sort_order"),
  };
}

function toExitInput(values: StationExitFormValues): StationExitInput {
  return {
    floorId: Number(values.floorId),
    name: values.name.trim(),
    nameJapanese: values.nameJapanese.trim() || null,
    code: values.code.trim() || null,
    description: values.description.trim() || null,
    descriptionJapanese: values.descriptionJapanese.trim() || null,
    colorCode: values.colorCode.trim() || null,
    sortOrder: Number(values.sortOrder),
  };
}

/**
 * Exits page: list, create, update and delete the exits of one station.
 * Each exit belongs to one floor of the station.
 */
export async function handleStationExits(
  request: Request,
  db: D1Database,
  stationId: number,
): Promise<StationExitFormResult> {
  const basePath = `/admin/stations/${stationId}/exits`;

  const url = new URL(request.url);
  const rawEditId = url.searchParams.get("edit_exit");
  const parsedEditId = Number(rawEditId);

  const [exits, floors] = await Promise.all([
    getStationExits(db, stationId),
    getStationFloors(db, stationId),
  ]);

  const nextSortOrder = nextSortOrderFor(exits);

  const result: StationExitFormResult = {
    redirectTo: null,
    exits,
    floors,
    values: emptyValues(nextSortOrder),
    errors: emptyStationExitErrors(),
    formError: "",
    editingId:
      rawEditId && Number.isInteger(parsedEditId) && parsedEditId > 0
        ? parsedEditId
        : null,
    nextSortOrder,
  };

  if (request.method !== "POST" && result.editingId !== null) {
    const exit = exits.find((item) => item.id === result.editingId);

    if (exit) {
      result.values = {
        floorId: String(exit.floor_id),
        name: exit.name,
        nameJapanese: exit.name_japanese ?? "",
        code: exit.code ?? "",
        colorCode: exit.color_code ?? "",
        description: exit.description ?? "",
        descriptionJapanese: exit.description_japanese ?? "",
        sortOrder: String(exit.sort_order),
      };
    } else {
      result.editingId = null;
    }
  }

  if (request.method !== "POST") {
    return result;
  }

  const formData = await request.formData();
  const action = readText(formData, "exit_action");

  if (!["create", "update", "delete", "delete_many"].includes(action)) {
    return result;
  }

  const exitId = Number(readText(formData, "exit_id"));
  const validExitId = Number.isInteger(exitId) && exitId > 0;

  const reload = async () => {
    if (!result.redirectTo) {
      result.exits = await getStationExits(db, stationId);
      result.nextSortOrder = nextSortOrderFor(result.exits);
    }

    return result;
  };

  if (action === "delete_many") {
    const ids = [...new Set(formData.getAll("exit_id").map((v) => Number(v)))];
    const owned = new Set(result.exits.map((row) => row.id));

    if (ids.length === 0 || ids.some((id) => !Number.isInteger(id) || !owned.has(id))) {
      result.formError = "Some selected exits were not found for this station.";
      return reload();
    }

    try {
      await deleteStationExits(db, stationId, ids);
      result.redirectTo = `${basePath}#station-exits`;
    } catch (error) {
      console.error("Failed to delete station exits:", error);
      result.formError = "Unable to delete the selected exits.";
    }

    return reload();
  }

  if (action === "delete") {
    if (!validExitId || !exits.some((exit) => exit.id === exitId)) {
      result.formError = "Exit not found for this station.";
      return result;
    }

    try {
      await deleteStationExit(db, stationId, exitId);
      result.redirectTo = `${basePath}#station-exits`;
    } catch (error) {
      console.error("Failed to delete station exit:", error);
      result.formError = "Unable to delete this exit.";
    }

    return reload();
  }

  result.values = readExitForm(formData);
  result.errors = validateStationExitForm(result.values);
  result.editingId = action === "update" ? exitId : null;

  if (action === "update" && !validExitId) {
    result.formError = "Invalid exit selected.";
    return result;
  }

  // The floor must belong to this station (never trust the posted id).
  if (
    !result.errors.floorId &&
    !floors.some((floor) => floor.id === Number(result.values.floorId))
  ) {
    result.errors.floorId = "Select a floor of this station.";
  }

  if (hasErrors(result.errors)) {
    return result;
  }

  if (action === "update" && !exits.some((exit) => exit.id === exitId)) {
    result.formError = "Exit not found for this station.";
    return result;
  }

  try {
    const input = toExitInput(result.values);

    if (action === "create") {
      await createStationExit(db, stationId, input);
    } else {
      await updateStationExit(db, stationId, exitId, input);
    }

    result.redirectTo = `${basePath}#station-exits`;
  } catch (error) {
    console.error("Failed to save station exit:", error);
    result.formError = "Unable to save this exit. Please try again.";
  }

  return reload();
}
