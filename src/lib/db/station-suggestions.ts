/**
 * Visitor suggestions for a station.
 *
 * A suggestion is a plain message written for one station (and the line the
 * visitor was looking at). The admin reads it and edits the station by hand;
 * nothing is applied automatically.
 *
 * The database keeps its original status names:
 *   pending  -> shown as "New"
 *   approved -> shown as "Resolved" (the admin dealt with it)
 *   rejected -> shown as "Dismissed" (no change needed)
 */

export type StationSuggestionStatus =
  | "pending"
  | "approved"
  | "rejected";

export const SUGGESTION_STATUS_LABELS: Record<
  StationSuggestionStatus,
  string
> = {
  pending: "New",
  approved: "Resolved",
  rejected: "Dismissed",
};

export interface StationSuggestion {
  id: number;
  station_id: number;
  station_name: string;
  station_slug: string;

  line_id: number | null;
  line_name: string | null;
  line_color: string | null;

  /** What the visitor wants to suggest. */
  message: string | null;

  status: StationSuggestionStatus;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateStationSuggestionInput {
  stationId: number;
  /** Line the visitor was viewing. Ignored if the station is not on it. */
  lineId?: number | null;
  message: string;
}

export interface StationSuggestionCounts {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}

const SELECT_SUGGESTION = `
  SELECT
    ss.*,
    s.name AS station_name,
    s.slug AS station_slug,
    l.name AS line_name,
    l.color AS line_color
  FROM station_suggestions ss
  INNER JOIN stations s
    ON s.id = ss.station_id
  LEFT JOIN lines l
    ON l.id = ss.line_id
`;

export async function getStationSuggestionById(
  db: D1Database,
  id: number,
): Promise<StationSuggestion | null> {
  return db
    .prepare(`${SELECT_SUGGESTION} WHERE ss.id = ? LIMIT 1`)
    .bind(id)
    .first<StationSuggestion>();
}

/**
 * One page of suggestions, newest first.
 * Pass a status to filter, or leave it out for every suggestion.
 */
export async function listStationSuggestions(
  db: D1Database,
  options: {
    status?: StationSuggestionStatus;
    limit: number;
    offset: number;
  },
): Promise<StationSuggestion[]> {
  const { status, limit, offset } = options;

  const query = `
    ${SELECT_SUGGESTION}
    ${status ? "WHERE ss.status = ?" : ""}
    ORDER BY ss.created_at DESC, ss.id DESC
    LIMIT ? OFFSET ?
  `;

  const statement = db.prepare(query);

  const result = status
    ? await statement.bind(status, limit, offset).all<StationSuggestion>()
    : await statement.bind(limit, offset).all<StationSuggestion>();

  return result.results;
}

export async function countStationSuggestions(
  db: D1Database,
): Promise<StationSuggestionCounts> {
  const result = await db
    .prepare(
      `
        SELECT status, COUNT(*) AS count
        FROM station_suggestions
        GROUP BY status
      `,
    )
    .all<{ status: StationSuggestionStatus; count: number }>();

  const counts: StationSuggestionCounts = {
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0,
  };

  for (const row of result.results) {
    if (row.status in counts) {
      counts[row.status] = row.count;
    }

    counts.total += row.count;
  }

  return counts;
}

/**
 * Save a visitor's suggestion.
 * This never modifies the live station or its relations.
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
          line_id,
          message
        )
        SELECT
          s.id,
          (
            SELECT ls.line_id
            FROM line_stations ls
            WHERE ls.station_id = s.id
              AND ls.line_id = ?
            LIMIT 1
          ),
          ?
        FROM stations s
        WHERE s.id = ?
      `,
    )
    .bind(input.lineId ?? null, input.message.trim(), input.stationId)
    .run();

  if (result.meta.changes !== 1) {
    throw new Error("Station not found.");
  }

  return Number(result.meta.last_row_id);
}

/** Move a suggestion to another status. False when it does not exist. */
export async function setStationSuggestionStatus(
  db: D1Database,
  id: number,
  status: StationSuggestionStatus,
): Promise<boolean> {
  const result = await db
    .prepare(
      `
        UPDATE station_suggestions
        SET
          status = ?,
          reviewed_at = CASE WHEN ? = 'pending' THEN NULL ELSE CURRENT_TIMESTAMP END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
    )
    .bind(status, status, id)
    .run();

  return result.meta.changes === 1;
}

export async function deleteStationSuggestion(
  db: D1Database,
  id: number,
): Promise<boolean> {
  const result = await db
    .prepare("DELETE FROM station_suggestions WHERE id = ?")
    .bind(id)
    .run();

  return result.meta.changes === 1;
}
