
export interface StationExit {
  id: number;
  station_id: number;
  floor_id: number;
  name: string;
  name_japanese: string | null;
  code: string | null;
  description: string | null;
  description_japanese: string | null;
  color_code: string | null;
  photo: string | null;
  photo_caption: string | null;
  photo_caption_japanese: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface StationExitInput {
  floorId: number;
  name: string;
  nameJapanese?: string | null;
  code?: string | null;
  description?: string | null;
  descriptionJapanese?: string | null;
  colorCode?: string | null;
  photoCaption?: string | null;
  photoCaptionJapanese?: string | null;
  /** undefined = keep the saved photo, null = remove it, string = new R2 key. */
  photo?: string | null;
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
          name_japanese,
          code,
          description,
          description_japanese,
          color_code,
          photo,
          photo_caption,
          photo_caption_japanese,
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
          name_japanese,
          code,
          description,
          description_japanese,
          color_code,
          sort_order,
          photo,
          photo_caption,
          photo_caption_japanese
        )
        SELECT ?, id, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        FROM station_floors
        WHERE id = ? AND station_id = ?
      `,
    )
    .bind(
      stationId,
      input.name.trim(),
      input.nameJapanese?.trim() || null,
      input.code?.trim() || null,
      input.description?.trim() || null,
      input.descriptionJapanese?.trim() || null,
      input.colorCode?.trim() || null,
      input.sortOrder ?? 0,
      input.photo ?? null,
      input.photoCaption?.trim() || null,
      input.photoCaptionJapanese?.trim() || null,
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
          name_japanese = ?,
          code = ?,
          description = ?,
          description_japanese = ?,
          color_code = ?,
          sort_order = ?,
          photo_caption = ?,
          photo_caption_japanese = ?,
          ${input.photo === undefined ? "" : "photo = ?,"}
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
      input.nameJapanese?.trim() || null,
      input.code?.trim() || null,
      input.description?.trim() || null,
      input.descriptionJapanese?.trim() || null,
      input.colorCode?.trim() || null,
      input.sortOrder ?? 0,
      input.photoCaption?.trim() || null,
      input.photoCaptionJapanese?.trim() || null,
      ...(input.photo === undefined ? [] : [input.photo]),
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

/**
 * Delete several rows of one station at once (all or nothing).
 */
export async function deleteStationExits(
  db: D1Database,
  stationId: number,
  ids: number[],
): Promise<void> {
  if (ids.length === 0) return;

  await db.batch(
    ids.map((id) =>
      db
        .prepare("DELETE FROM station_exits WHERE station_id = ? AND id = ?")
        .bind(stationId, id),
    ),
  );
}
