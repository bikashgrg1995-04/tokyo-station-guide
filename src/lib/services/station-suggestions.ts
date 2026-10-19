import { getStationById } from "../db/stations";
import {
  SUGGESTION_STATUS_LABELS,
  countStationSuggestions,
  createStationSuggestion,
  listStationSuggestions,
  type StationSuggestionStatus,
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

/* ========================================
   Admin: Suggestions page
======================================== */

const PER_PAGE = 10;

export type SuggestionFilter = StationSuggestionStatus | "all";

export const SUGGESTION_FILTERS: Array<{ value: SuggestionFilter; label: string }> = [
  { value: "pending", label: "New" },
  { value: "approved", label: "Resolved" },
  { value: "rejected", label: "Dismissed" },
  { value: "all", label: "All" },
];

export function formatSuggestionDate(value: string): string {
  // SQLite stores UTC as "YYYY-MM-DD HH:MM:SS".
  const date = new Date(value.replace(" ", "T") + "Z");

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function suggestionSnippet(value: string | null, max = 110): string {
  const text = (value ?? "").replace(/\s+/g, " ").trim();

  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

/** Everything the Suggestions page shows for the requested filter and page. */
export async function loadSuggestionsPage(db: D1Database, url: URL) {
  const statusParam = url.searchParams.get("status");

  const filter: SuggestionFilter = SUGGESTION_FILTERS.some(
    (item) => item.value === statusParam,
  )
    ? (statusParam as SuggestionFilter)
    : "pending";

  const counts = await countStationSuggestions(db);

  const totalItems = filter === "all" ? counts.total : counts[filter];
  const totalPages = Math.max(1, Math.ceil(totalItems / PER_PAGE));

  const pageParam = Number(url.searchParams.get("page"));
  const currentPage = Math.min(
    Math.max(Number.isInteger(pageParam) ? pageParam : 1, 1),
    totalPages,
  );

  const suggestions = await listStationSuggestions(db, {
    status: filter === "all" ? undefined : filter,
    limit: PER_PAGE,
    offset: (currentPage - 1) * PER_PAGE,
  });

  // Data for the detail dialog. Embedded as JSON so it opens instantly.
  const dialogData = suggestions.map((suggestion) => ({
    id: suggestion.id,
    status: suggestion.status,
    statusLabel: SUGGESTION_STATUS_LABELS[suggestion.status],
    stationId: suggestion.station_id,
    stationName: suggestion.station_name,
    lineName: suggestion.line_name,
    lineColor: suggestion.line_color,
    message: suggestion.message,
    submittedAt: formatSuggestionDate(suggestion.created_at),
    reviewedAt: suggestion.reviewed_at
      ? formatSuggestionDate(suggestion.reviewed_at)
      : null,
  }));

  return {
    filter,
    counts,
    suggestions,
    totalItems,
    totalPages,
    currentPage,
    perPage: PER_PAGE,
    dialogJson: JSON.stringify(dialogData).replace(/</g, "\\u003c"),
    filterCount: (value: SuggestionFilter) =>
      value === "all" ? counts.total : counts[value],
    filterUrl: (value: SuggestionFilter) =>
      value === "pending"
        ? "/admin/suggestions"
        : `/admin/suggestions?status=${value}`,
    paginationBase: `/admin/suggestions${
      filter === "pending" ? "" : `?status=${filter}`
    }`,
  };
}
