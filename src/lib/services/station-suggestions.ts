import { getStationById } from "../db/stations";
import { createStationSuggestion } from "../db/station-suggestions";
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
    lineId: read("lineId"),
    message: read("message"),
  };
}

/**
 * Public endpoint behind "Suggest an Edit".
 *
 * It only stores the message together with the station and line it was
 * written for. Nothing on the live station is changed: an admin reads the
 * suggestion and updates the station by hand.
 */
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
        message: errors.message || "Please check your suggestion.",
        errors,
      },
    };
  }

  const stationId = Number(values.stationId);
  const lineId = values.lineId ? Number(values.lineId) : null;

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

  try {
    const suggestionId = await createStationSuggestion(db, {
      stationId,
      lineId,
      message: values.message,
    });

    return {
      status: 201,
      body: {
        ok: true,
        message: "Thank you! Your suggestion has been sent for review.",
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
