
/* ========================================
   Facilities Database Helpers
======================================== */

export interface Facility {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  sort_order: number;
}

export interface StationFacility {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  sort_order: number;
  facility_count: number | null;
  floor: string | null;
  note: string | null;
}

export interface FacilityInput {
  name: string;
  slug: string;
  icon?: string | null;
  sortOrder?: number;
}

export interface PaginatedFacilities {
  items: Facility[];
  totalItems: number;
  currentPage: number;
  totalPages: number;
  perPage: number;
}

/* ========================================
   Get All Facilities
======================================== */

export async function getFacilities(
  db: D1Database,
): Promise<Facility[]> {
  const result = await db
    .prepare(
      `
        SELECT id, name, slug, icon, sort_order
        FROM facilities
        ORDER BY sort_order ASC, name ASC
      `,
    )
    .all<Facility>();

  return result.results;
}

/* ========================================
   Get Paginated Facilities
======================================== */

export async function getFacilitiesPaginated(
  db: D1Database,
  options: {
    page?: number;
    perPage?: number;
    search?: string;
  } = {},
): Promise<PaginatedFacilities> {
  const perPage = Math.max(1, options.perPage ?? 10);
  const requestedPage = Math.max(1, options.page ?? 1);
  const search = options.search?.trim() ?? "";
  const searchValue = `%${search}%`;

  const countResult = await db
    .prepare(
      `
        SELECT COUNT(*) AS total
        FROM facilities
        WHERE
          ? = ''
          OR name LIKE ?
          OR slug LIKE ?
          OR icon LIKE ?
      `,
    )
    .bind(search, searchValue, searchValue, searchValue)
    .first<{ total: number }>();

  const totalItems = Number(countResult?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  const currentPage = Math.min(requestedPage, totalPages);
  const offset = (currentPage - 1) * perPage;

  const result = await db
    .prepare(
      `
        SELECT id, name, slug, icon, sort_order
        FROM facilities
        WHERE
          ? = ''
          OR name LIKE ?
          OR slug LIKE ?
          OR icon LIKE ?
        ORDER BY sort_order ASC, name ASC
        LIMIT ? OFFSET ?
      `,
    )
    .bind(
      search,
      searchValue,
      searchValue,
      searchValue,
      perPage,
      offset,
    )
    .all<Facility>();

  return {
    items: result.results,
    totalItems,
    currentPage,
    totalPages,
    perPage,
  };
}

/* ========================================
   Get Facility By ID
======================================== */

export async function getFacilityById(
  db: D1Database,
  id: number,
): Promise<Facility | null> {
  const result = await db
    .prepare(
      `
        SELECT id, name, slug, icon, sort_order
        FROM facilities
        WHERE id = ?
        LIMIT 1
      `,
    )
    .bind(id)
    .first<Facility>();

  return result ?? null;
}

/* ========================================
   Create Facility
======================================== */

export async function createFacility(
  db: D1Database,
  input: FacilityInput,
): Promise<number> {
  const result = await db
    .prepare(
      `
        INSERT INTO facilities (
          name, slug, icon, sort_order
        )
        VALUES (?, ?, ?, ?)
      `,
    )
    .bind(
      input.name.trim(),
      input.slug.trim(),
      input.icon?.trim() || null,
      input.sortOrder ?? 0,
    )
    .run();

  return result.meta.last_row_id;
}

/* ========================================
   Update Facility
======================================== */

export async function updateFacility(
  db: D1Database,
  id: number,
  input: FacilityInput,
): Promise<void> {
  await db
    .prepare(
      `
        UPDATE facilities
        SET
          name = ?,
          slug = ?,
          icon = ?,
          sort_order = ?
        WHERE id = ?
      `,
    )
    .bind(
      input.name.trim(),
      input.slug.trim(),
      input.icon?.trim() || null,
      input.sortOrder ?? 0,
      id,
    )
    .run();
}

/* ========================================
   Check Facility Assignments
======================================== */

export async function hasFacilityAssignments(
  db: D1Database,
  id: number,
): Promise<boolean> {
  const result = await db
    .prepare(
      `
        SELECT 1 AS assigned
        FROM station_facilities
        WHERE facility_id = ?
        LIMIT 1
      `,
    )
    .bind(id)
    .first<{ assigned: number }>();

  return result !== null;
}

/* ========================================
   Delete Facility
======================================== */

export async function deleteFacility(
  db: D1Database,
  id: number,
): Promise<void> {
  const assigned = await hasFacilityAssignments(db, id);

  if (assigned) {
    throw new Error(
      "This facility is assigned to one or more stations. Remove those assignments before deleting it.",
    );
  }

  await db
    .prepare(
      `
        DELETE FROM facilities
        WHERE id = ?
      `,
    )
    .bind(id)
    .run();
}

/* ========================================
   Get Facilities Assigned to Station
======================================== */

export async function getStationFacilities(
  db: D1Database,
  stationId: number,
): Promise<StationFacility[]> {
  const result = await db
    .prepare(
      `
        SELECT
          f.id,
          f.name,
          f.slug,
          f.icon,
          f.sort_order,
          sf.facility_count,
          sf.floor,
          sf.note
        FROM station_facilities sf
        INNER JOIN facilities f
          ON f.id = sf.facility_id
        WHERE sf.station_id = ?
        ORDER BY f.sort_order ASC, f.name ASC
      `,
    )
    .bind(stationId)
    .all<StationFacility>();

  return result.results;
}

/* ========================================
   Get Facilities Not Assigned to Station
======================================== */

export async function getAvailableFacilitiesForStation(
  db: D1Database,
  stationId: number,
): Promise<Facility[]> {
  const result = await db
    .prepare(
      `
        SELECT
          f.id,
          f.name,
          f.slug,
          f.icon,
          f.sort_order
        FROM facilities f
        WHERE NOT EXISTS (
          SELECT 1
          FROM station_facilities sf
          WHERE sf.station_id = ?
            AND sf.facility_id = f.id
        )
        ORDER BY f.sort_order ASC, f.name ASC
      `,
    )
    .bind(stationId)
    .all<Facility>();

  return result.results;
}
