export interface StationPlatform {
  id: number;
  station_id: number;
  line_id: number | null;
  platform_number: string;
  destinations: string | null;
  destinations_japanese: string | null;
  notes: string | null;
  notes_japanese: string | null;
  sort_order: number;
  line_name: string | null;
  line_code: string | null;
}

export interface StationPlatformInput {
  lineId: number | null;
  platformNumber: string;
  destinations: string | null;
  destinationsJapanese?: string | null;
  notes: string | null;
  notesJapanese?: string | null;
  sortOrder: number;
}

/**
 * Get all physical platforms belonging to a station.
 */
export async function getStationPlatforms(
  db: D1Database,
  stationId: number,
): Promise<StationPlatform[]> {
  const result = await db
    .prepare(
      `
        SELECT
          sp.id,
          sp.station_id,
          sp.destinations,
          sp.destinations_japanese,
          sp.line_id,
          sp.platform_number,
          sp.notes,
          sp.notes_japanese,
          sp.sort_order,
          l.name AS line_name,
          l.code AS line_code
        FROM station_platforms sp
        LEFT JOIN lines l
          ON l.id = sp.line_id
        WHERE sp.station_id = ?
        ORDER BY
          sp.sort_order ASC,
          sp.platform_number ASC
      `,
    )
    .bind(stationId)
    .all<StationPlatform>();

  return result.results;
}

/**
 * Get a station's platforms as JSON for UI use.
 */
export async function getStationPlatformsJson(
  db: D1Database,
  stationId: number,
): Promise<string | null> {
  const platforms = await getStationPlatforms(db, stationId);

  if (!platforms.length) {
    return null;
  }

  return JSON.stringify(
    platforms.map((platform) => ({
      number: platform.platform_number,
      destinations: platform.destinations,
      destinations_japanese: platform.destinations_japanese,
      line: platform.line_name,
      lineCode: platform.line_code,
      notes: platform.notes,
      notes_japanese: platform.notes_japanese,
    })),
  );
}

/**
 * Create a physical platform for a station.
 */
export async function createStationPlatform(
  db: D1Database,
  stationId: number,
  input: StationPlatformInput,
): Promise<void> {
  await db

    .prepare(
      `
    INSERT INTO station_platforms (
      station_id,
      line_id,
      platform_number,
      destinations,
      destinations_japanese,
      notes,
      notes_japanese,
      sort_order
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `,
    )
    .bind(
      stationId,
      input.lineId,
      input.platformNumber.trim(),
      input.destinations,
      input.destinationsJapanese?.trim() || null,
      input.notes,
      input.notesJapanese?.trim() || null,
      input.sortOrder,
    )
    .run();
}

/**
 * Update an existing physical platform.
 */
export async function updateStationPlatform(
  db: D1Database,
  stationId: number,
  platformId: number,
  input: StationPlatformInput,
): Promise<void> {
  await db

    .prepare(
      `
    UPDATE station_platforms
    SET
      line_id = ?,
      platform_number = ?,
      destinations = ?,
      destinations_japanese = ?,
      notes = ?,
      notes_japanese = ?,
      sort_order = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
      AND station_id = ?
  `,
    )
    .bind(
      input.lineId,
      input.platformNumber.trim(),
      input.destinations,
      input.destinationsJapanese?.trim() || null,
      input.notes,
      input.notesJapanese?.trim() || null,
      input.sortOrder,
      platformId,
      stationId,
    )
    .run();
}

/**
 * Delete a platform belonging to a station.
 */
export async function deleteStationPlatform(
  db: D1Database,
  stationId: number,
  platformId: number,
): Promise<void> {
  await db
    .prepare(
      `
        DELETE FROM station_platforms
        WHERE id = ?
          AND station_id = ?
      `,
    )
    .bind(platformId, stationId)
    .run();
}
