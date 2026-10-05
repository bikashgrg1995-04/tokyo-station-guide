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
  about: string | null;
  facilities: string | null;
  top_picks: string | null;
  connections: string | null;
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

export interface StationSearchResult {
  id: number;
  name: string;
  name_japanese: string | null;
  slug: string;
  line_name: string | null;
  line_code: string | null;
  station_code: string | null;
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

/*
 * Used by the admin edit page.
 * facilities / top_picks / connections are JSON strings.
 */
export interface StationEditItem extends StationAdminListItem {
  about: string | null;
  facilities: string | null;
  top_picks: string | null;
  connections: string | null;
}

export interface CreateStationInput {
  name: string;
  nameJapanese?: string | null;
  slug: string;
  latitude?: number | null;
  longitude?: number | null;
  description?: string | null;
  about?: string | null;
  facilities?: string | null;
  topPicks?: string | null;
  connections?: string | null;
}

export interface UpdateStationInput {
  name: string;
  nameJapanese?: string | null;
  slug: string;
  latitude?: number | null;
  longitude?: number | null;
  description?: string | null;
  about?: string | null;
  facilities?: string | null;
  topPicks?: string | null;
  connections?: string | null;
}

export interface PaginatedStations {
  items: StationAdminListItem[];
  totalItems: number;
  currentPage: number;
  totalPages: number;
  perPage: number;
}

/* ========================================
   Station Detail Field Helpers

   facilities and top_picks:
     textarea, one item per line
     <-> JSON array of strings

   connections:
     textarea, one per line: "Name | #color"
     <-> JSON array of { name, color? }
======================================== */

export function splitLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function validateLineList(
  text: string,
  label: string,
  maxItems = 20,
  maxLength = 60,
): string {
  const items = splitLines(text);

  if (items.length > maxItems) {
    return `${label} can have at most ${maxItems} items.`;
  }

  if (items.some((item) => item.length > maxLength)) {
    return `Each ${label.toLowerCase()} item must be ${maxLength} characters or less.`;
  }

  return "";
}

export function linesToJson(text: string): string | null {
  const items = splitLines(text);

  return items.length ? JSON.stringify(items) : null;
}

export function jsonToLines(json: string | null | undefined): string {
  if (!json) {
    return "";
  }

  try {
    const parsed = JSON.parse(json);

    return Array.isArray(parsed) ? parsed.join("\n") : "";
  } catch {
    return json;
  }
}

export function connectionsToJson(text: string): {
  json: string | null;
  error: string;
} {
  const items: { name: string; color?: string }[] = [];

  for (const line of splitLines(text)) {
    const [rawName, rawColor] = line.split("|").map((part) => part.trim());

    if (!rawName) {
      return { json: null, error: "Each connection needs a name." };
    }

    if (rawName.length > 80) {
      return {
        json: null,
        error: "Connection names must be 80 characters or less.",
      };
    }

    if (rawColor && !/^#[0-9a-fA-F]{3,8}$/.test(rawColor)) {
      return {
        json: null,
        error: `Invalid color "${rawColor}". Use a hex color like #f15a22.`,
      };
    }

    items.push(rawColor ? { name: rawName, color: rawColor } : { name: rawName });
  }

  if (items.length > 20) {
    return { json: null, error: "Connections can have at most 20 items." };
  }

  return {
    json: items.length ? JSON.stringify(items) : null,
    error: "",
  };
}

export function jsonToConnections(json: string | null | undefined): string {
  if (!json) {
    return "";
  }

  try {
    const parsed = JSON.parse(json);

    if (!Array.isArray(parsed)) {
      return "";
    }

    return parsed
      .map((item: { name?: string; color?: string }) =>
        item.color ? `${item.name} | ${item.color}` : String(item.name ?? ""),
      )
      .filter(Boolean)
      .join("\n");
  } catch {
    return "";
  }
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
          about,
          facilities,
          top_picks,
          connections,
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

export async function getStations(
  db: D1Database,
): Promise<StationListItem[]> {
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
   Search Stations
======================================== */

export async function searchStations(
  db: D1Database,
  query: string,
  limit = 10,
): Promise<StationSearchResult[]> {
  const search = query.trim();

  if (!search) {
    return [];
  }

  const searchValue = `%${search}%`;

  const safeLimit = Math.max(
    1,
    Math.min(limit, 50),
  );

  const result = await db
    .prepare(
      `
        SELECT
          s.id,
          s.name,
          s.name_japanese,
          s.slug,
          l.name AS line_name,
          l.code AS line_code,
          ls.station_code
        FROM stations s
        LEFT JOIN line_stations ls
          ON ls.station_id = s.id
        LEFT JOIN lines l
          ON l.id = ls.line_id
        WHERE
          s.name LIKE ?
          OR s.name_japanese LIKE ?
          OR s.slug LIKE ?
          OR l.name LIKE ?
          OR l.code LIKE ?
          OR ls.station_code LIKE ?
        ORDER BY
          s.name ASC,
          l.name ASC,
          ls.station_code ASC
        LIMIT ?
      `,
    )
    .bind(
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      safeLimit,
    )
    .all<StationSearchResult>();

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

  const totalPages = Math.max(
    1,
    Math.ceil(totalItems / perPage),
  );

  const currentPage = Math.min(
    requestedPage,
    totalPages,
  );

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
): Promise<StationEditItem | null> {
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
          about,
          facilities,
          top_picks,
          connections,
          created_at,
          updated_at
        FROM stations
        WHERE id = ?
        LIMIT 1
      `,
    )
    .bind(id)
    .first<StationEditItem>();

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
          description,
          about,
          facilities,
          top_picks,
          connections
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    )
    .bind(
      input.name.trim(),
      input.nameJapanese?.trim() || null,
      input.slug.trim(),
      input.latitude ?? null,
      input.longitude ?? null,
      input.description?.trim() || null,
      input.about?.trim() || null,
      input.facilities || null,
      input.topPicks || null,
      input.connections || null,
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
          about = ?,
          facilities = ?,
          top_picks = ?,
          connections = ?,
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
      input.about?.trim() || null,
      input.facilities || null,
      input.topPicks || null,
      input.connections || null,
      id,
    )
    .run();
}

/* ========================================
   Delete Station
======================================== */

export async function deleteStation(
  db: D1Database,
  id: number,
): Promise<void> {
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