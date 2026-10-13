
/* ========================================
   Facilities Database Helpers
======================================== */

export interface Facility {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  icon_dark: string | null;
  sort_order: number;
}



export interface StationFacility {
  id: number;
  facility_id: number;
  floor_id: number;
  floor_name: string;
  floor_name_japanese: string | null;
  name: string;
  slug: string;
  icon: string | null;
  icon_dark: string | null;
  sort_order: number;
  facility_count: number | null;
  note: string | null;
  exits: StationFacilityExit[];
}

export interface StationFacilityExit {
  id: number;
  name: string;
  code: string | null;
  color_code: string | null;
  floor_id: number;
  floor_name: string;
  floor_name_japanese: string | null;
}

export interface FacilityInput {
  name: string;
  slug: string;
  icon?: string | null;
  iconDark?: string | null;
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
        SELECT id, name, slug, icon, icon_dark, sort_order
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
        SELECT id, name, slug, icon, icon_dark, sort_order
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
        SELECT id, name, slug, icon, icon_dark, sort_order
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
          name, slug, icon, icon_dark, sort_order
        )
        VALUES (?, ?, ?, ?, ?)
      `,
    )
    .bind(
      input.name.trim(),
      input.slug.trim(),
      input.icon?.trim() || null,
      input.iconDark?.trim() || null,
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
          icon_dark = ?,
          sort_order = ?
        WHERE id = ?
      `,
    )
    .bind(
      input.name.trim(),
      input.slug.trim(),
      input.icon?.trim() || null,
      input.iconDark?.trim() || null,
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
        FROM station_floor_facilities
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
          sff.id,
          f.id AS facility_id,
          f.name,
          f.slug,
          f.icon,
          f.icon_dark,
          f.sort_order,
          sff.facility_count,
          sff.note,
          sf.id AS floor_id,
          sf.name AS floor_name,
          sf.name_japanese AS floor_name_japanese
        FROM station_floor_facilities sff
        INNER JOIN station_floors sf
          ON sf.id = sff.floor_id
        INNER JOIN facilities f
          ON f.id = sff.facility_id
        WHERE sf.station_id = ?
        ORDER BY
          sf.floor_order ASC,
          sf.name ASC,
          f.sort_order ASC,
          f.name ASC
      `,
    )
    .bind(stationId)
    .all<Omit<StationFacility, "exits">>();

  const facilities = result.results;

  if (facilities.length === 0) {
    return [];
  }

  const exitResult = await db
    .prepare(
      `
        SELECT
          sffe.station_floor_facility_id,
          se.id,
          se.name,
          se.code,
          se.color_code,
          esf.id AS floor_id,
          esf.name AS floor_name,
          esf.name_japanese AS floor_name_japanese
        FROM station_floor_facility_exits sffe
        INNER JOIN station_exits se
          ON se.id = sffe.station_exit_id
        INNER JOIN station_floors esf
          ON esf.id = se.floor_id
        INNER JOIN station_floors assigned_floor
          ON assigned_floor.id = (
            SELECT sff.floor_id
            FROM station_floor_facilities sff
            WHERE sff.id = sffe.station_floor_facility_id
          )
        WHERE assigned_floor.station_id = ?
        ORDER BY esf.floor_order ASC, se.sort_order ASC, se.name ASC
      `,
    )
    .bind(stationId)
    .all<{
      station_floor_facility_id: number;
      id: number;
      name: string;
      code: string | null;
      color_code: string | null;
      floor_id: number;
      floor_name: string;
      floor_name_japanese: string | null;
    }>();

  const exitsByFacility = new Map<number, StationFacilityExit[]>();

  for (const exit of exitResult.results) {
    const exits = exitsByFacility.get(exit.station_floor_facility_id) ?? [];

    exits.push({
      id: exit.id,
      name: exit.name,
      code: exit.code,
      color_code: exit.color_code,
      floor_id: exit.floor_id,
      floor_name: exit.floor_name,
      floor_name_japanese: exit.floor_name_japanese,
    });

    exitsByFacility.set(exit.station_floor_facility_id, exits);
  }

  return facilities.map((facility) => ({
    ...facility,
    exits: exitsByFacility.get(facility.id) ?? [],
  }));
}


/* ========================================
   Get Facilities Not Assigned to Station
======================================== */
export async function getAvailableFacilitiesForStation(
  db: D1Database,
  _stationId: number,
): Promise<Facility[]> {
  return getFacilities(db);
}

