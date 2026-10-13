

export interface LineStationItem {
  id: number;
  station_id: number;
  station_name: string;
  station_name_japanese: string | null;
  station_slug: string;
  station_order: number;
  station_code: string | null;
}

export interface AvailableStation {
  id: number;
  name: string;
  name_japanese: string | null;
  slug: string;
}

/* ========================================
   Get Stations For A Line
================================ */

export async function getStationsForLine(
  db: D1Database,
  lineId: number,
  search?: string,
): Promise<LineStationItem[]> {
  const searchValue = search?.trim() ?? "";

  if (searchValue) {
    const searchPattern = `%${searchValue}%`;

    const result = await db
      .prepare(
        `
          SELECT
            ls.id,
            s.id AS station_id,
            s.name AS station_name,
            s.name_japanese AS station_name_japanese,
            s.slug AS station_slug,
            ls.station_order,
            ls.station_code
          FROM line_stations ls
          INNER JOIN stations s
            ON s.id = ls.station_id
          WHERE ls.line_id = ?
            AND (
              s.name LIKE ?
              OR s.name_japanese LIKE ?
              OR s.slug LIKE ?
              OR ls.station_code LIKE ?
            )
          ORDER BY ls.station_order ASC
        `,
      )
      .bind(
        lineId,
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern,
      )
      .all<LineStationItem>();

    return result.results;
  }

  const result = await db
    .prepare(
      `
        SELECT
          ls.id,
          s.id AS station_id,
          s.name AS station_name,
          s.name_japanese AS station_name_japanese,
          s.slug AS station_slug,
          ls.station_order,
          ls.station_code
        FROM line_stations ls
        INNER JOIN stations s
          ON s.id = ls.station_id
        WHERE ls.line_id = ?
        ORDER BY ls.station_order ASC
      `,
    )
    .bind(lineId)
    .all<LineStationItem>();

  return result.results;
}

/* ========================================
   Get Available Stations For A Line
================================ */

export async function getAvailableStationsForLine(
  db: D1Database,
  lineId: number,
): Promise<AvailableStation[]> {
  const result = await db
    .prepare(
      `
        SELECT
          s.id,
          s.name,
          s.name_japanese,
          s.slug
        FROM stations s
        WHERE NOT EXISTS (
          SELECT 1
          FROM line_stations ls
          WHERE ls.line_id = ?
            AND ls.station_id = s.id
        )
        ORDER BY s.name ASC
      `,
    )
    .bind(lineId)
    .all<AvailableStation>();

  return result.results;
}

/* ========================================
   Add Station To Line
================================ */

export async function addStationToLine(
  db: D1Database,
  lineId: number,
  stationId: number,
  stationOrder: number,
  stationCode?: string | null,
): Promise<number> {
  const result = await db
    .prepare(
      `
        INSERT INTO line_stations (
          line_id,
          station_id,
          station_order,
          station_code
        )
        VALUES (?, ?, ?, ?)
      `,
    )
    .bind(
      lineId,
      stationId,
      stationOrder,
      stationCode?.trim() || null,
    )
    .run();

  return result.meta.last_row_id;
}

/* ========================================
   Update Line Station
================================ */

export async function updateLineStation(
  db: D1Database,
  id: number,
  stationOrder: number,
  stationCode?: string | null,
): Promise<void> {
  await db
    .prepare(
      `
        UPDATE line_stations
        SET
          station_order = ?,
          station_code = ?
        WHERE id = ?
      `,
    )
    .bind(
      stationOrder,
      stationCode?.trim() || null,
      id,
    )
    .run();
}

/* ========================================
   Remove Station From Line
================================ */

export async function removeStationFromLine(
  db: D1Database,
  id: number,
): Promise<void> {
  await db
    .prepare(
      `
        DELETE FROM line_stations
        WHERE id = ?
      `,
    )
    .bind(id)
    .run();
}
