
import {
  getStationById,
} from "../db/stations";
import {
  createStationSuggestion,
} from "../db/station-suggestions";
import {
  emptyStationSuggestionErrors,
  validateStationSuggestion,
  type StationSuggestionValues,
} from "../validators/station-suggestion";

function readValues(formData: FormData): StationSuggestionValues {
  function read(key: string): string {
    const value = formData.get(key);
    return typeof value === "string" ? value.trim() : "";
  }

  return {
    stationId: read("stationId"),
    name: read("name"),
    nameJapanese: read("nameJapanese"),
    description: read("description"),
    about: read("about"),
    latitude: read("latitude"),
    longitude: read("longitude"),
    reason: read("reason"),
    submitterName: read("submitterName"),
    submitterEmail: read("submitterEmail"),
  };
}

function changedText(
  proposed: string,
  current: string | null,
): string | null {
  if (!proposed) return null;

  return proposed !== (current ?? "").trim() ? proposed : null;
}

function changedNumber(
  proposed: string,
  current: number | null,
): number | null {
  if (!proposed) return null;

  const value = Number(proposed);

  return current !== null && value === current ? null : value;
}

export async function handleStationSuggestion(
  request: Request,
  db: D1Database,
) {
  if (request.method !== "POST") {
    return {
      status: 405,
      body: { ok: false, message: "Method not allowed." },
    };
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return {
      status: 400,
      body: { ok: false, message: "Invalid form submission." },
    };
  }

  const values = readValues(formData);
  const errors = validateStationSuggestion(values);

  if (Object.values(errors).some(Boolean)) {
    return {
      status: 400,
      body: {
        ok: false,
        message: "Please check the submitted fields.",
        errors,
      },
    };
  }

  const stationId = Number(values.stationId);

  let station;

  try {
    station = await getStationById(db, stationId);
  } catch (error) {
    console.error("Failed to read station for suggestion:", error);

    return {
      status: 500,
      body: {
        ok: false,
        message: "Unable to process the suggestion right now.",
      },
    };
  }

  if (!station) {
    const stationErrors = emptyStationSuggestionErrors();
    stationErrors.stationId = "This station could not be found.";

    return {
      status: 404,
      body: {
        ok: false,
        message: "Station not found.",
        errors: stationErrors,
      },
    };
  }

  const suggestedName = changedText(values.name, station.name);
  const suggestedNameJapanese = changedText(
    values.nameJapanese,
    station.name_japanese,
  );
  const suggestedDescription = changedText(
    values.description,
    station.description,
  );
  const suggestedAbout = changedText(values.about, station.about);
  const suggestedLatitude = changedNumber(
    values.latitude,
    station.latitude,
  );
  const suggestedLongitude = changedNumber(
    values.longitude,
    station.longitude,
  );

  const hasChanges = [
    suggestedName,
    suggestedNameJapanese,
    suggestedDescription,
    suggestedAbout,
    suggestedLatitude,
    suggestedLongitude,
  ].some((value) => value !== null);

  if (!hasChanges) {
    return {
      status: 400,
      body: {
        ok: false,
        message: "Please make at least one change before submitting.",
      },
    };
  }

  try {
    const suggestionId = await createStationSuggestion(db, {
      stationId,
      suggestedName,
      suggestedNameJapanese,
      suggestedDescription,
      suggestedAbout,
      suggestedLatitude,
      suggestedLongitude,
      reason: values.reason || null,
      submitterName: values.submitterName || null,
      submitterEmail: values.submitterEmail || null,
    });

    return {
      status: 201,
      body: {
        ok: true,
        message: "Your suggestion has been submitted for review.",
        suggestionId,
      },
    };
  } catch (error) {
    console.error("Failed to save station suggestion:", error);

    return {
      status: 500,
      body: {
        ok: false,
        message: "Unable to submit your suggestion right now.",
      },
    };
  }
}
