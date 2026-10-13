
export interface StationExit {
  id: number;
  station_id: number;
  floor_id: number;
  name: string;
  code: string | null;
  description: string | null;
  color_code: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface StationExitInput {
  floorId: number;
  name: string;
  code?: string | null;
  description?: string | null;
  colorCode?: string | null;
  sortOrder?: number;
}

/**
 * Get all exits belonging to a station.
 * Multiple exits are supported on each floor.
 */
export async function getStationExits(
  db: D1Database,
  stationId: number,
): Promise<StationExit[]> {
  const result = await db
    .prepare(
      `
        SELECT
          id,
          station_id,
          floor_id,
          name,
          code,
          description,
          color_code,
          sort_order,
          created_at,
          updated_at
        FROM station_exits
        WHERE station_id = ?
        ORDER BY floor_id ASC, sort_order ASC, name ASC
      `,
    )
    .bind(stationId)
    .all<StationExit>();

  return result.results;
}

/**
 * Create an exit only if the floor belongs to the station.
 */
export async function createStationExit(
  db: D1Database,
  stationId: number,
  input: StationExitInput,
): Promise<number> {
  const result = await db
    .prepare(
      `
        INSERT INTO station_exits (
          station_id,
          floor_id,
          name,
          code,
          description,
          color_code,
          sort_order
        )
        SELECT ?, id, ?, ?, ?, ?, ?
        FROM station_floors
        WHERE id = ? AND station_id = ?
      `,
    )
    .bind(
      stationId,
      input.name.trim(),
      input.code?.trim() || null,
      input.description?.trim() || null,
      input.colorCode?.trim() || null,
      input.sortOrder ?? 0,
      input.floorId,
      stationId,
    )
    .run();

  if (result.meta.changes === 0) {
    throw new Error("The selected floor does not belong to this station.");
  }

  return result.meta.last_row_id;
}

/**
 * Update an exit without allowing it to move to another station.
 */
export async function updateStationExit(
  db: D1Database,
  stationId: number,
  exitId: number,
  input: StationExitInput,
): Promise<void> {
  const result = await db
    .prepare(
      `
        UPDATE station_exits
        SET
          floor_id = ?,
          name = ?,
          code = ?,
          description = ?,
          color_code = ?,
          sort_order = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND station_id = ?
          AND EXISTS (
            SELECT 1
            FROM station_floors
            WHERE id = ? AND station_id = ?
          )
      `,
    )
    .bind(
      input.floorId,
      input.name.trim(),
      input.code?.trim() || null,
      input.description?.trim() || null,
      input.colorCode?.trim() || null,
      input.sortOrder ?? 0,
      exitId,
      stationId,
      input.floorId,
      stationId,
    )
    .run();

  if (result.meta.changes === 0) {
    throw new Error(
      "The exit or selected floor does not belong to this station.",
    );
  }
}

/**
 * Delete an exit belonging to a station.
 */
export async function deleteStationExit(
  db: D1Database,
  stationId: number,
  exitId: number,
): Promise<void> {
  await db
    .prepare(
      `
        DELETE FROM station_exits
        WHERE station_id = ? AND id = ?
      `,
    )
    .bind(stationId, exitId)
    .run();
}
