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

  /*
   * Compatibility fields.
   *
   * The actual data is stored relationally in:
   * - station_facilities -> facilities
   * - station_top_picks -> top_picks
   * - line_stations -> lines -> operators
   *
   * They are returned as JSON strings because the
   * existing public UI expects this format.
   */
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
  /** Facility ids to save (used instead of `facilities` when given). */
  facilityIds?: number[];
  /** Top pick ids to save, in order (used instead of `topPicks` when given). */
  topPickIds?: number[];
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
  /** Facility ids to save (used instead of `facilities` when given). */
  facilityIds?: number[];
  /** Top pick ids to save, in order (used instead of `topPicks` when given). */
  topPickIds?: number[];
}

export interface PaginatedStations {
  items: StationAdminListItem[];
  totalItems: number;
  currentPage: number;
  totalPages: number;
  perPage: number;
}


/* ========================================
   Internal Relation Helpers
======================================== */

/*
 * Convert station_facilities relational data into the
 * JSON string expected by the existing UI.
 *
 * Example:
 * [
 *   "Ticket Office",
 *   "Coin Lockers",
 *   "Wi-Fi"
 * ]
 */
async function getStationFacilitiesJson(
  db: D1Database,
  stationId: number,
): Promise<string | null> {
  const result = await db
    .prepare(
      `
        SELECT
          f.name
        FROM station_facilities sf
        INNER JOIN facilities f
          ON f.id = sf.facility_id
        WHERE sf.station_id = ?
        ORDER BY
          f.sort_order ASC,
          f.name ASC
      `,
    )
    .bind(stationId)
    .all<{ name: string }>();

  if (!result.results.length) {
    return null;
  }

  return JSON.stringify(
    result.results.map((item) => item.name),
  );
}

/*
 * Convert station_top_picks relational data into the
 * JSON string expected by the existing UI.
 */
async function getStationTopPicksJson(
  db: D1Database,
  stationId: number,
): Promise<string | null> {
  const result = await db
    .prepare(
      `
        SELECT
          tp.name,
          stp.sort_order
        FROM station_top_picks stp
        INNER JOIN top_picks tp
          ON tp.id = stp.top_pick_id
        WHERE stp.station_id = ?
        ORDER BY
          stp.sort_order ASC
      `,
    )
    .bind(stationId)
    .all<{
      name: string;
      sort_order: number;
    }>();

  if (!result.results.length) {
    return null;
  }

  return JSON.stringify(
    result.results.map((item) => item.name),
  );
}

/*
 * Convert line_stations relational data into the
 * JSON string expected by the existing UI.
 *
 * Connections are automatically derived from:
 *
 * station
 *   -> line_stations
 *      -> lines
 *         -> operators
 *
 * This means the station does not store manual
 * connection data.
 */
async function getStationConnectionsJson(
  db: D1Database,
  stationId: number,
): Promise<string | null> {
  const result = await db
    .prepare(
      `
        SELECT
          json_group_array(
            json_object(
              'name', connection.name,
              'code', connection.code,
              'color', connection.color,
              'type', connection.line_type,
              'operator', connection.operator_name
            )
          ) AS connections
        FROM (
          SELECT
            l.name,
            l.code,
            l.color,
            l.line_type,
            o.name AS operator_name
          FROM line_stations ls
          INNER JOIN lines l
            ON l.id = ls.line_id
          LEFT JOIN operators o
            ON o.id = l.operator_id
          WHERE ls.station_id = ?
          ORDER BY
            ls.station_order ASC,
            l.name ASC
        ) connection
      `,
    )
    .bind(stationId)
    .first<{ connections: string | null }>();

  if (!result?.connections || result.connections === "[]") {
    return null;
  }

  return result.connections;
}

/*
 * Parse a JSON array of strings safely.
 */
function parseStringListJson(
  json: string | null | undefined,
): string[] {
  if (!json) {
    return [];
  }

  try {
    const parsed = JSON.parse(json);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => String(item).trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

/*
 * Resolve facility names entered by the admin to actual
 * facility IDs.
 *
 * We support both:
 * - facility name
 * - facility slug
 */
async function resolveFacilityIds(
  db: D1Database,
  json: string | null | undefined,
): Promise<number[]> {
  const names = parseStringListJson(json);

  if (!names.length) {
    return [];
  }

  const ids: number[] = [];

  for (const name of names) {
    const result = await db
      .prepare(
        `
          SELECT id
          FROM facilities
          WHERE
            LOWER(name) = LOWER(?)
            OR LOWER(slug) = LOWER(?)
          LIMIT 1
        `,
      )
      .bind(name, name)
      .first<{ id: number }>();

    if (!result) {
      throw new Error(
        `Facility "${name}" does not exist.`,
      );
    }

    if (!ids.includes(result.id)) {
      ids.push(result.id);
    }
  }

  return ids;
}

/*
 * Resolve top-pick names entered by the admin to actual
 * top_picks IDs.
 *
 * We support both:
 * - top pick name
 * - top pick slug
 */
async function resolveTopPickIds(
  db: D1Database,
  json: string | null | undefined,
): Promise<number[]> {
  const names = parseStringListJson(json);

  if (!names.length) {
    return [];
  }

  const ids: number[] = [];

  for (const name of names) {
    const result = await db
      .prepare(
        `
          SELECT id
          FROM top_picks
          WHERE
            LOWER(name) = LOWER(?)
            OR LOWER(slug) = LOWER(?)
          LIMIT 1
        `,
      )
      .bind(name, name)
      .first<{ id: number }>();

    if (!result) {
      throw new Error(
        `Top pick "${name}" does not exist.`,
      );
    }

    if (!ids.includes(result.id)) {
      ids.push(result.id);
    }
  }

  return ids;
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
          created_at,
          updated_at
        FROM stations
        WHERE slug = ?
        LIMIT 1
      `,
    )
    .bind(slug)
    .first<
      Omit<
        Station,
        "lines" | "facilities" | "top_picks" | "connections"
      >
    >();

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

  const facilities = await getStationFacilitiesJson(
    db,
    station.id,
  );

  const topPicks = await getStationTopPicksJson(
    db,
    station.id,
  );

  const connections = await getStationConnectionsJson(
    db,
    station.id,
  );

  return {
    ...station,
    facilities,
    top_picks: topPicks,
    connections,
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
  const perPage = Math.max(
    1,
    options.perPage ?? 10,
  );

  const requestedPage = Math.max(
    1,
    options.page ?? 1,
  );

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
    .bind(
      search,
      searchValue,
      searchValue,
      searchValue,
      searchValue,
    )
    .first<{ total: number }>();

  const totalItems = Number(
    countResult?.total ?? 0,
  );

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
          created_at,
          updated_at
        FROM stations
        WHERE id = ?
        LIMIT 1
      `,
    )
    .bind(id)
    .first<
      StationAdminListItem & {
        about: string | null;
      }
    >();

  if (!station) {
    return null;
  }

  const facilities = await getStationFacilitiesJson(
    db,
    station.id,
  );

  const topPicks = await getStationTopPicksJson(
    db,
    station.id,
  );

  const connections = await getStationConnectionsJson(
    db,
    station.id,
  );

  return {
    ...station,
    facilities,
    top_picks: topPicks,
    connections,
  };
}

/* ========================================
   Create Station
======================================== */

export async function createStation(
  db: D1Database,
  input: CreateStationInput,
): Promise<number> {
  /*
   * Validate/resolve relations before creating the station.
   * This prevents creating a station with invalid
   * facility/top-pick references.
   */
  const facilityIds =
    input.facilityIds ?? (await resolveFacilityIds(db, input.facilities));

  const topPickIds =
    input.topPickIds ?? (await resolveTopPickIds(db, input.topPicks));

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
          about
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
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
    )
    .run();

  const stationId = Number(
    result.meta.last_row_id,
  );

  const statements: D1PreparedStatement[] = [];

  facilityIds.forEach((facilityId) => {
    statements.push(
      db
        .prepare(
          `
            INSERT INTO station_facilities (
              station_id,
              facility_id,
              note
            )
            VALUES (?, ?, NULL)
          `,
        )
        .bind(stationId, facilityId),
    );
  });

  topPickIds.forEach((topPickId, index) => {
    statements.push(
      db
        .prepare(
          `
            INSERT INTO station_top_picks (
              station_id,
              top_pick_id,
              sort_order,
              walking_minutes
            )
            VALUES (?, ?, ?, NULL)
          `,
        )
        .bind(
          stationId,
          topPickId,
          index + 1,
        ),
    );
  });

  if (statements.length) {
    await db.batch(statements);
  }

  return stationId;
}

/* ========================================
   Update Station
======================================== */

export async function updateStation(
  db: D1Database,
  id: number,
  input: UpdateStationInput,
): Promise<void> {
  /*
   * Resolve relations first so invalid names do not
   * partially modify the station.
   */
  const facilityIds =
    input.facilityIds ?? (await resolveFacilityIds(db, input.facilities));

  const topPickIds =
    input.topPickIds ?? (await resolveTopPickIds(db, input.topPicks));

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
      id,
    )
    .run();

  const statements: D1PreparedStatement[] = [
    db
      .prepare(
        `
          DELETE FROM station_facilities
          WHERE station_id = ?
        `,
      )
      .bind(id),

    db
      .prepare(
        `
          DELETE FROM station_top_picks
          WHERE station_id = ?
        `,
      )
      .bind(id),
  ];

  facilityIds.forEach((facilityId) => {
    statements.push(
      db
        .prepare(
          `
            INSERT INTO station_facilities (
              station_id,
              facility_id,
              note
            )
            VALUES (?, ?, NULL)
          `,
        )
        .bind(id, facilityId),
    );
  });

  topPickIds.forEach((topPickId, index) => {
    statements.push(
      db
        .prepare(
          `
            INSERT INTO station_top_picks (
              station_id,
              top_pick_id,
              sort_order,
              walking_minutes
            )
            VALUES (?, ?, ?, NULL)
          `,
        )
        .bind(
          id,
          topPickId,
          index + 1,
        ),
    );
  });

  if (statements.length) {
    await db.batch(statements);
  }
}

/* ========================================
   Delete Station
======================================== */

export async function deleteStation(
  db: D1Database,
  id: number,
): Promise<void> {
  await db.batch([
    db
      .prepare(
        `
          DELETE FROM station_facilities
          WHERE station_id = ?
        `,
      )
      .bind(id),

    db
      .prepare(
        `
          DELETE FROM station_top_picks
          WHERE station_id = ?
        `,
      )
      .bind(id),

    db
      .prepare(
        `
          DELETE FROM line_stations
          WHERE station_id = ?
        `,
      )
      .bind(id),

    db
      .prepare(
        `
          DELETE FROM stations
          WHERE id = ?
        `,
      )
      .bind(id),
  ]);
}