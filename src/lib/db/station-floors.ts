
export interface StationFloor {
  id: number;
  station_id: number;
  name: string;
  name_japanese: string | null;
  floor_order: number;
  created_at: string;
  updated_at: string;
}

export interface StationFloorInput {
  name: string;
  nameJapanese: string | null;
  floorOrder: number;
}

/**
 * Get all floors belonging to a station.
 */
export async function getStationFloors(
  db: D1Database,
  stationId: number,
): Promise<StationFloor[]> {
  const result = await db
    .prepare(
      `
        SELECT
          id,
          station_id,
          name,
          name_japanese,
          floor_order,
          created_at,
          updated_at
        FROM station_floors
        WHERE station_id = ?
        ORDER BY floor_order ASC, name ASC
      `,
    )
    .bind(stationId)
    .all<StationFloor>();

  return result.results;
}

/**
 * Get one floor, scoped to its station.
 */
export async function getStationFloorById(
  db: D1Database,
  stationId: number,
  floorId: number,
): Promise<StationFloor | null> {
  return db
    .prepare(
      `
        SELECT
          id,
          station_id,
          name,
          name_japanese,
          floor_order,
          created_at,
          updated_at
        FROM station_floors
        WHERE station_id = ? AND id = ?
        LIMIT 1
      `,
    )
    .bind(stationId, floorId)
    .first<StationFloor>();
}

/**
 * Create a floor for a station.
 */
export async function createStationFloor(
  db: D1Database,
  stationId: number,
  input: StationFloorInput,
): Promise<number> {
  const result = await db
    .prepare(
      `
        INSERT INTO station_floors (
          station_id,
          name,
          name_japanese,
          floor_order
        )
        VALUES (?, ?, ?, ?)
      `,
    )
    .bind(
      stationId,
      input.name.trim(),
      input.nameJapanese?.trim() || null,
      input.floorOrder,
    )
    .run();

  return result.meta.last_row_id;
}

/**
 * Update a floor without allowing it to move to another station.
 */
export async function updateStationFloor(
  db: D1Database,
  stationId: number,
  floorId: number,
  input: StationFloorInput,
): Promise<void> {
  await db
    .prepare(
      `
        UPDATE station_floors
        SET
          name = ?,
          name_japanese = ?,
          floor_order = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE station_id = ? AND id = ?
      `,
    )
    .bind(
      input.name.trim(),
      input.nameJapanese?.trim() || null,
      input.floorOrder,
      stationId,
      floorId,
    )
    .run();
}

/**
 * Delete a floor belonging to a station.
 *
 * Related floor-facility, floor-top-pick and exit assignments
 * cascade-delete. Platforms become unassigned because floor_id
 * uses ON DELETE SET NULL.
 */
export async function deleteStationFloor(
  db: D1Database,
  stationId: number,
  floorId: number,
): Promise<void> {
  await db
    .prepare(
      `
        DELETE FROM station_floors
        WHERE station_id = ? AND id = ?
      `,
    )
    .bind(stationId, floorId)
    .run();
}
