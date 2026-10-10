/* ========================================
   Search stations
======================================== */

import type {
  StationSearchResult,
} from "./types";

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
