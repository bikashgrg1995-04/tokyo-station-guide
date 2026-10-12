
import {
  createStationFloor,
  deleteStationFloor,
  getStationFloors,
  updateStationFloor,
  type StationFloor,
  type StationFloorInput,
} from "../db/station-floors";

import { readText, hasErrors } from "./common";

import {
  emptyStationFloorErrors,
  validateStationFloorForm,
  type StationFloorFormErrors,
  type StationFloorFormValues,
} from "../validators/station-floor";

export interface StationFloorFormResult {
  redirectTo: string | null;
  floors: StationFloor[];
  values: StationFloorFormValues;
  errors: StationFloorFormErrors;
  formError: string;
  editingId: number | null;
}

function emptyValues(): StationFloorFormValues {
  return {
    name: "",
    nameJapanese: "",
    floorOrder: "0",
  };
}

function readFloorForm(formData: FormData): StationFloorFormValues {
  return {
    name: readText(formData, "name"),
    nameJapanese: readText(formData, "name_japanese"),
    floorOrder: readText(formData, "floor_order"),
  };
}

function toFloorInput(
  values: StationFloorFormValues,
): StationFloorInput {
  return {
    name: values.name.trim(),
    nameJapanese: values.nameJapanese.trim() || null,
    floorOrder: Number(values.floorOrder),
  };
}

export async function handleStationFloors(
  request: Request,
  db: D1Database,
  stationId: number,
): Promise<StationFloorFormResult> {
  const basePath = `/admin/stations/${stationId}/floors`;

  const url = new URL(request.url);
  const rawEditId = url.searchParams.get("edit_floor");
  const parsedEditId = Number(rawEditId);

  const result: StationFloorFormResult = {
    redirectTo: null,
    floors: await getStationFloors(db, stationId),
    values: emptyValues(),
    errors: emptyStationFloorErrors(),
    formError: "",
    editingId:
      rawEditId && Number.isInteger(parsedEditId) && parsedEditId > 0
        ? parsedEditId
        : null,
  };

  if (request.method !== "POST" && result.editingId !== null) {
    const floor = result.floors.find(
      (item) => item.id === result.editingId,
    );

    if (floor) {
      result.values = {
        name: floor.name,
        nameJapanese: floor.name_japanese ?? "",
        floorOrder: String(floor.floor_order),
      };
    } else {
      result.editingId = null;
    }
  }

  if (request.method !== "POST") {
    return result;
  }

  const formData = await request.formData();
  const action = readText(formData, "floor_action");

  if (!["create", "update", "delete"].includes(action)) {
    return result;
  }

  const floorId = Number(readText(formData, "floor_id"));

  if (action === "delete") {
    if (!Number.isInteger(floorId) || floorId <= 0) {
      result.formError = "Invalid floor selected.";
      return result;
    }

    const floorExists = result.floors.some(
      (floor) => floor.id === floorId,
    );

    if (!floorExists) {
      result.formError = "Floor not found for this station.";
      return result;
    }

    try {
      await deleteStationFloor(db, stationId, floorId);
      result.redirectTo = `${basePath}#station-floors`;
    } catch (error) {
      console.error("Failed to delete station floor:", error);
      result.formError = "Unable to delete this floor.";
    }

    if (!result.redirectTo) {
      result.floors = await getStationFloors(db, stationId);
    }

    return result;
  }

  result.values = readFloorForm(formData);
  result.errors = validateStationFloorForm(result.values);
  result.editingId = action === "update" ? floorId : null;

  if (
    action === "update" &&
    (!Number.isInteger(floorId) || floorId <= 0)
  ) {
    result.formError = "Invalid floor selected.";
    return result;
  }

  const duplicateFloor = result.floors.some(
    (floor) =>
      floor.name.trim().toLocaleLowerCase() ===
        result.values.name.trim().toLocaleLowerCase() &&
      floor.id !== (action === "update" ? floorId : null),
  );

  if (duplicateFloor) {
    result.errors.name = "This floor name already exists for this station.";
  }

  if (hasErrors(result.errors)) {
    return result;
  }

  try {
    const input = toFloorInput(result.values);

    if (action === "create") {
      await createStationFloor(db, stationId, input);
    } else {
      const floorExists = result.floors.some(
        (floor) => floor.id === floorId,
      );

      if (!floorExists) {
        result.formError = "Floor not found for this station.";
        return result;
      }

      await updateStationFloor(db, stationId, floorId, input);
    }

    result.redirectTo = `${basePath}#station-floors`;
  } catch (error) {
    console.error("Failed to save station floor:", error);
    result.formError =
      "Unable to save this floor. Check whether its name already exists.";
  }

  if (!result.redirectTo) {
    result.floors = await getStationFloors(db, stationId);
  }

  return result;
}
