import {
  createStationPlatform,
  deleteStationPlatform,
  getStationPlatforms,
  updateStationPlatform,
  type StationPlatform,
  type StationPlatformInput,
} from "../db/station-platforms";

import { getLines, type Line } from "../db/lines";

import { readText, hasErrors } from "./common";

import {
  emptyStationPlatformErrors,
  validateStationPlatformForm,
  type StationPlatformFormErrors,
  type StationPlatformFormValues,
} from "../validators/station-platform";

export interface StationPlatformFormResult {
  redirectTo: string | null;
  platforms: StationPlatform[];
  lines: Line[];
  values: StationPlatformFormValues;
  errors: StationPlatformFormErrors;
  formError: string;
  editingId: number | null;
}

function emptyValues(): StationPlatformFormValues {
  return {
    lineId: "",
    platformNumber: "",
    destinations: "",
    destinationsJapanese: "",
    notes: "",
    notesJapanese: "",
    sortOrder: "0",
  };
}

function readPlatformForm(formData: FormData): StationPlatformFormValues {
  return {
    lineId: readText(formData, "line_id"),
    platformNumber: readText(formData, "platform_number"),
    destinations: readText(formData, "destinations"),
    destinationsJapanese: readText(formData, "destinations_japanese"),
    notes: readText(formData, "notes"),
    notesJapanese: readText(formData, "notes_japanese"),
    sortOrder: readText(formData, "sort_order"),
  };
}

function toPlatformInput(
  values: StationPlatformFormValues,
): StationPlatformInput {
  return {
    lineId: values.lineId ? Number(values.lineId) : null,
    platformNumber: values.platformNumber,
    destinations: values.destinations || null,
    destinationsJapanese: values.destinationsJapanese || null,
    notes: values.notes || null,
    notesJapanese: values.notesJapanese || null,
    sortOrder: Number(values.sortOrder),
  };
}

export async function handleStationPlatforms(
  request: Request,
  db: D1Database,
  stationId: number,
): Promise<StationPlatformFormResult> {
  const result: StationPlatformFormResult = {
    redirectTo: null,
    platforms: await getStationPlatforms(db, stationId),
    lines: await getLines(db),
    values: emptyValues(),
    errors: emptyStationPlatformErrors(),
    formError: "",
    editingId: (() => {
      const url = new URL(request.url);
      const rawId = url.searchParams.get("edit_platform");
      const parsedId = Number(rawId);

      return rawId && Number.isInteger(parsedId) && parsedId > 0
        ? parsedId
        : null;
    })(),
  };

  if (request.method !== "POST" && result.editingId !== null) {
    const platform = result.platforms.find(
      (item) => item.id === result.editingId,
    );

    if (platform) {
      result.values = {
        lineId: platform.line_id === null ? "" : String(platform.line_id),
        platformNumber: platform.platform_number,
        destinations: platform.destinations ?? "",
        destinationsJapanese: platform.destinations_japanese ?? "",
        notes: platform.notes ?? "",
        notesJapanese: platform.notes_japanese ?? "",
        sortOrder: String(platform.sort_order),
      };
    } else {
      result.editingId = null;
    }
  }

  if (request.method !== "POST") {
    return result;
  }

  const formData = await request.formData();
  const action = readText(formData, "platform_action");

  if (!["create", "update", "delete"].includes(action)) {
    return result;
  }

  const platformId = Number(readText(formData, "platform_id"));

  if (action === "delete") {
    if (!Number.isInteger(platformId) || platformId <= 0) {
      result.formError = "Invalid platform selected.";
      return result;
    }
    const platformExists = result.platforms.some(
      (platform) => platform.id === platformId,
    );

    if (!platformExists) {
      result.formError = "Platform not found for this station.";
      return result;
    }
    try {
      await deleteStationPlatform(db, stationId, platformId);
      result.redirectTo = `/admin/stations/${stationId}/platforms#station-platforms`;
    } catch (err) {
      console.error("Failed to delete station platform:", err);
      result.formError = "Unable to delete this platform.";
    }

    if (!result.redirectTo) {
      result.platforms = await getStationPlatforms(db, stationId);
    }

    return result;
  }

  result.values = readPlatformForm(formData);
  result.errors = validateStationPlatformForm(result.values);
  result.editingId = action === "update" ? platformId : null;

  if (
    action === "update" &&
    (!Number.isInteger(platformId) || platformId <= 0)
  ) {
    result.formError = "Invalid platform selected.";
    return result;
  }

  if (result.values.lineId) {
    const lineId = Number(result.values.lineId);
    const validLine = result.lines.some((line) => line.id === lineId);

    if (!validLine) {
      result.errors.lineId = "Select a valid railway line.";
    }
  }

  if (hasErrors(result.errors)) {
    return result;
  }

  try {
    const input = toPlatformInput(result.values);

    if (action === "create") {
      await createStationPlatform(db, stationId, input);
    } else {
      const platformExists = result.platforms.some(
        (platform) => platform.id === platformId,
      );

      if (!platformExists) {
        result.formError = "Platform not found for this station.";
        return result;
      }
      await updateStationPlatform(db, stationId, platformId, input);
    }

    result.redirectTo = `/admin/stations/${stationId}/platforms#station-platforms`;
  } catch (err) {
    console.error("Failed to save station platform:", err);
    result.formError = "Unable to save this platform. Please try again.";
  }

  if (!result.redirectTo) {
    result.platforms = await getStationPlatforms(db, stationId);
  }

  return result;
}
