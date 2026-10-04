/* ========================================
   Stations Database Helpers
======================================== */

export interface StationLine {
  id: number;
  name: string;
  slug: string;
  code: string | null;
  operator_name: string;
}

export interface Station {
  id: number;
  name: string;
  name_japanese: string | null;
  slug: string;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  lines: StationLine[];
}

export interface StationListItem {
  id: number;
  name: string;
  name_japanese: string | null;
  slug: string;
}

export interface StationAdminListItem {
  id: number;
  name: string;
  name_japanese: string | null;
  slug: string;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateStationInput {
  name: string;
  nameJapanese?: string | null;
  slug: string;
  latitude?: number | null;
  longitude?: number | null;
  description?: string | null;
}

export interface UpdateStationInput {
  name: string;
  nameJapanese?: string | null;
  slug: string;
  latitude?: number | null;
  longitude?: number | null;
  description?: string | null;
}

export interface PaginatedStations {
  items: StationAdminListItem[];
  totalItems: number;
  currentPage: number;
  totalPages: number;
  perPage: number;
}

/* ========================================
   Get Station By Slug
======================================== */

export async function getStationBySlug(
  db: D1Database,
  slug: string,
): Promise<Station | null> {
  const station = await db
    .prepare(
      `
        SELECT
          id,
          name,
          name_japanese,
          slug,
          latitude,
          longitude,
          description,
          created_at,
          updated_at
        FROM stations
        WHERE slug = ?
        LIMIT 1
      `,
    )
    .bind(slug)
    .first<Omit<Station, "lines">>();

  if (!station) {
    return null;
  }

  const lines = await db
    .prepare(
      `
        SELECT
          l.id,
          l.name,
          l.slug,
          l.code,
          o.name AS operator_name
        FROM line_stations ls
        INNER JOIN lines l
          ON l.id = ls.line_id
        INNER JOIN operators o
          ON o.id = l.operator_id
        WHERE ls.station_id = ?
        ORDER BY ls.station_order ASC
      `,
    )
    .bind(station.id)
    .all<StationLine>();

  return {
    ...station,
    lines: lines.results,
  };
}

/* ========================================
   Get Stations
======================================== */

export async function getStations(db: D1Database): Promise<StationListItem[]> {
  const result = await db
    .prepare(
      `
        SELECT
          id,
          name,
          name_japanese,
          slug
        FROM stations
        ORDER BY name ASC
      `,
    )
    .all<StationListItem>();

  return result.results;
}

/* ========================================
   Get Stations For Admin
======================================== */

export async function getAdminStations(
  db: D1Database,
): Promise<StationAdminListItem[]> {
  const result = await db
    .prepare(
      `
        SELECT
          id,
          name,
          name_japanese,
          slug,
          latitude,
          longitude,
          description,
          created_at,
          updated_at
        FROM stations
        ORDER BY name ASC
      `,
    )
    .all<StationAdminListItem>();

  return result.results;
}

/* ========================================
   Get Stations For Admin - Paginated
======================================== */

export async function getAdminStationsPaginated(
  db: D1Database,
  options: {
    page?: number;
    perPage?: number;
    search?: string;
  } = {},
): Promise<PaginatedStations> {
  const perPage = Math.max(1, options.perPage ?? 10);

  const requestedPage = Math.max(1, options.page ?? 1);

  const search = options.search?.trim() ?? "";

  const searchValue = `%${search}%`;

  const countResult = await db
    .prepare(
      `
        SELECT COUNT(*) AS total
        FROM stations
        WHERE
          ? = ''
          OR name LIKE ?
          OR name_japanese LIKE ?
          OR slug LIKE ?
          OR description LIKE ?
      `,
    )
    .bind(search, searchValue, searchValue, searchValue, searchValue)
    .first<{ total: number }>();

  const totalItems = Number(countResult?.total ?? 0);

  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));

  const currentPage = Math.min(requestedPage, totalPages);

  const offset = (currentPage - 1) * perPage;

  const result = await db
    .prepare(
      `
        SELECT
          id,
          name,
          name_japanese,
          slug,
          latitude,
          longitude,
          description,
          created_at,
          updated_at
        FROM stations
        WHERE
          ? = ''
          OR name LIKE ?
          OR name_japanese LIKE ?
          OR slug LIKE ?
          OR description LIKE ?
        ORDER BY name ASC
        LIMIT ? OFFSET ?
      `,
    )
    .bind(
      search,
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      perPage,
      offset,
    )
    .all<StationAdminListItem>();

  return {
    items: result.results,
    totalItems,
    currentPage,
    totalPages,
    perPage,
  };
}

/* ========================================
   Get Station By ID
======================================== */

export async function getStationById(
  db: D1Database,
  id: number,
): Promise<StationAdminListItem | null> {
  const result = await db
    .prepare(
      `
        SELECT
          id,
          name,
          name_japanese,
          slug,
          latitude,
          longitude,
          description,
          created_at,
          updated_at
        FROM stations
        WHERE id = ?
        LIMIT 1
      `,
    )
    .bind(id)
    .first<StationAdminListItem>();

  return result ?? null;
}

/* ========================================
   Create Station
======================================== */

export async function createStation(
  db: D1Database,
  input: CreateStationInput,
): Promise<number> {
  const result = await db
    .prepare(
      `
        INSERT INTO stations (
          name,
          name_japanese,
          slug,
          latitude,
          longitude,
          description
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `,
    )
    .bind(
      input.name.trim(),
      input.nameJapanese?.trim() || null,
      input.slug.trim(),
      input.latitude ?? null,
      input.longitude ?? null,
      input.description?.trim() || null,
    )
    .run();

  return result.meta.last_row_id;
}

/* ========================================
   Update Station
======================================== */

export async function updateStation(
  db: D1Database,
  id: number,
  input: UpdateStationInput,
): Promise<void> {
  await db
    .prepare(
      `
        UPDATE stations
        SET
          name = ?,
          name_japanese = ?,
          slug = ?,
          latitude = ?,
          longitude = ?,
          description = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
    )
    .bind(
      input.name.trim(),
      input.nameJapanese?.trim() || null,
      input.slug.trim(),
      input.latitude ?? null,
      input.longitude ?? null,
      input.description?.trim() || null,
      id,
    )
    .run();
}

/* ========================================
   Delete Station
======================================== */

export async function deleteStation(db: D1Database, id: number): Promise<void> {
  await db
    .prepare(
      `
        DELETE FROM stations
        WHERE id = ?
      `,
    )
    .bind(id)
    .run();
}
