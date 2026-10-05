/* ========================================
   Featured Stations Database Helpers
======================================== */

export interface FeaturedStation {
  id: number;
  station_id: number;
  station_name: string;
  station_name_japanese: string | null;
  station_slug: string;
  image_url: string;
  description: string;
  sort_order: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface FeaturedStationListItem {
  id: number;
  station_id: number;
  station_name: string;
  station_name_japanese: string | null;
  image_url: string;
  description: string;
  sort_order: number;
  is_active: number;
}

export interface CreateFeaturedStationInput {
  stationId: number;
  imageUrl: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateFeaturedStationInput {
  stationId: number;
  imageUrl: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

/* ========================================
   Get Featured Stations
======================================== */

export async function getFeaturedStations(
  db: D1Database,
  activeOnly = true,
): Promise<FeaturedStationListItem[]> {
  const result = await db
    .prepare(
      `
        SELECT
          fs.id,
          fs.station_id,
          s.name AS station_name,
          s.name_japanese AS station_name_japanese,
          fs.image_url,
          fs.description,
          fs.sort_order,
          fs.is_active
        FROM featured_stations fs
        INNER JOIN stations s
          ON s.id = fs.station_id
        WHERE
          ? = 0
          OR fs.is_active = 1
        ORDER BY
          fs.sort_order ASC,
          s.name ASC
      `,
    )
    .bind(activeOnly ? 1 : 0)
    .all<FeaturedStationListItem>();

  return result.results;
}

/* ========================================
   Get Featured Station By ID
======================================== */

export async function getFeaturedStationById(
  db: D1Database,
  id: number,
): Promise<FeaturedStation | null> {
  const result = await db
    .prepare(
      `
        SELECT
          fs.id,
          fs.station_id,
          s.name AS station_name,
          s.name_japanese AS station_name_japanese,
          s.slug AS station_slug,
          fs.image_url,
          fs.description,
          fs.sort_order,
          fs.is_active,
          fs.created_at,
          fs.updated_at
        FROM featured_stations fs
        INNER JOIN stations s
          ON s.id = fs.station_id
        WHERE fs.id = ?
        LIMIT 1
      `,
    )
    .bind(id)
    .first<FeaturedStation>();

  return result ?? null;
}

/* ========================================
   Create Featured Station
======================================== */

export async function createFeaturedStation(
  db: D1Database,
  input: CreateFeaturedStationInput,
): Promise<number> {
  const result = await db
    .prepare(
      `
        INSERT INTO featured_stations (
          station_id,
          image_url,
          description,
          sort_order,
          is_active
        )
        VALUES (?, ?, ?, ?, ?)
      `,
    )
    .bind(
      input.stationId,
      input.imageUrl.trim(),
      input.description?.trim() || "",
      input.sortOrder ?? 0,
      input.isActive === false ? 0 : 1,
    )
    .run();

  return result.meta.last_row_id;
}

/* ========================================
   Update Featured Station
======================================== */

export async function updateFeaturedStation(
  db: D1Database,
  id: number,
  input: UpdateFeaturedStationInput,
): Promise<void> {
  await db
    .prepare(
      `
        UPDATE featured_stations
        SET
          station_id = ?,
          image_url = ?,
          description = ?,
          sort_order = ?,
          is_active = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
    )
    .bind(
      input.stationId,
      input.imageUrl.trim(),
      input.description?.trim() || "",
      input.sortOrder ?? 0,
      input.isActive === false ? 0 : 1,
      id,
    )
    .run();
}

/* ========================================
   Delete Featured Station
======================================== */

export async function deleteFeaturedStation(
  db: D1Database,
  id: number,
): Promise<void> {
  await db
    .prepare(
      `
        DELETE FROM featured_stations
        WHERE id = ?
      `,
    )
    .bind(id)
    .run();
}