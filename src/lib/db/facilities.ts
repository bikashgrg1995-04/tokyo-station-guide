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
  note: string | null;
}

/* ========================================
   Get All Facilities
======================================== */

export async function getFacilities(db: D1Database): Promise<Facility[]> {
  const result = await db
    .prepare(
      `
        SELECT
          id,
          name,
          slug,
          icon,
          sort_order
        FROM facilities
        ORDER BY
          sort_order ASC,
          name ASC
      `,
    )
    .all<Facility>();

  return result.results;
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
          sf.note
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
        ORDER BY
          f.sort_order ASC,
          f.name ASC
      `,
    )
    .bind(stationId)
    .all<Facility>();

  return result.results;
}


