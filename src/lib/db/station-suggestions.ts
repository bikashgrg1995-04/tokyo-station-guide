
export type StationSuggestionStatus =
  | "pending"
  | "approved"
  | "rejected";

export interface StationSuggestion {
  id: number;
  station_id: number;
  station_name: string;
  station_slug: string;

  suggested_name: string | null;
  suggested_name_japanese: string | null;
  suggested_description: string | null;
  suggested_about: string | null;
  suggested_latitude: number | null;
  suggested_longitude: number | null;

  suggested_lines: string | null;
  suggested_platforms: string | null;
  suggested_facilities: string | null;
  suggested_top_picks: string | null;

  reason: string | null;
  submitter_name: string | null;
  submitter_email: string | null;

  status: StationSuggestionStatus;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateStationSuggestionInput {
  stationId: number;

  suggestedName?: string | null;
  suggestedNameJapanese?: string | null;
  suggestedDescription?: string | null;
  suggestedAbout?: string | null;
  suggestedLatitude?: number | null;
  suggestedLongitude?: number | null;

  suggestedLines?: string | null;
  suggestedPlatforms?: string | null;
  suggestedFacilities?: string | null;
  suggestedTopPicks?: string | null;

  reason?: string | null;
  submitterName?: string | null;
  submitterEmail?: string | null;
}

/**
 * Get a suggestion by ID.
 */
export async function getStationSuggestionById(
  db: D1Database,
  id: number,
): Promise<StationSuggestion | null> {
  return db
    .prepare(
      `
        SELECT
          ss.*,
          s.name AS station_name,
          s.slug AS station_slug
        FROM station_suggestions ss
        INNER JOIN stations s
          ON s.id = ss.station_id
        WHERE ss.id = ?
        LIMIT 1
      `,
    )
    .bind(id)
    .first<StationSuggestion>();
}

/**
 * List station suggestions, newest first.
 * Optionally filter by review status.
 */
export async function getStationSuggestions(
  db: D1Database,
  status?: StationSuggestionStatus,
): Promise<StationSuggestion[]> {
  const query = `
    SELECT
      ss.*,
      s.name AS station_name,
      s.slug AS station_slug
    FROM station_suggestions ss
    INNER JOIN stations s
      ON s.id = ss.station_id
    ${status ? "WHERE ss.status = ?" : ""}
    ORDER BY ss.created_at DESC, ss.id DESC
  `;

  const statement = db.prepare(query);

  const result = status
    ? await statement.bind(status).all<StationSuggestion>()
    : await statement.all<StationSuggestion>();

  return result.results;
}

/**
 * Save a proposed station edit.
 * This function does not modify the live station or its relations.
 */
export async function createStationSuggestion(
  db: D1Database,
  input: CreateStationSuggestionInput,
): Promise<number> {
  const result = await db
    .prepare(
      `
        INSERT INTO station_suggestions (
          station_id,
          suggested_name,
          suggested_name_japanese,
          suggested_description,
          suggested_about,
          suggested_latitude,
          suggested_longitude,
          suggested_lines,
          suggested_platforms,
          suggested_facilities,
          suggested_top_picks,
          reason,
          submitter_name,
          submitter_email
        )
        SELECT
          id,
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        FROM stations
        WHERE id = ?
      `,
    )
    .bind(
      input.suggestedName?.trim() || null,
      input.suggestedNameJapanese?.trim() || null,
      input.suggestedDescription?.trim() || null,
      input.suggestedAbout?.trim() || null,
      input.suggestedLatitude ?? null,
      input.suggestedLongitude ?? null,
      input.suggestedLines ?? null,
      input.suggestedPlatforms ?? null,
      input.suggestedFacilities ?? null,
      input.suggestedTopPicks ?? null,
      input.reason?.trim() || null,
      input.submitterName?.trim() || null,
      input.submitterEmail?.trim() || null,
      input.stationId,
    )
    .run();

  if (result.meta.changes !== 1) {
    throw new Error("Station not found.");
  }

  return Number(result.meta.last_row_id);
}
