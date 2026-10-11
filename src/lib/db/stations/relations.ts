/* ========================================
   Station relations (facilities, top picks, connections)
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
export async function getStationFacilitiesJson(
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

  return JSON.stringify(result.results.map((item) => item.name));
}

export async function getStationFacilityDetailsJson(
  db: D1Database,
  stationId: number,
): Promise<string | null> {
  const result = await db
    .prepare(
      `
        SELECT
          f.name,
          f.icon
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
    .all<{ name: string; icon: string | null }>();

  if (!result.results.length) {
    return null;
  }

  return JSON.stringify(result.results);
}

/*
 * Convert station_top_picks relational data into the
 * JSON string expected by the existing UI.
 */
export async function getStationTopPicksJson(
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

  return JSON.stringify(result.results.map((item) => item.name));
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
export async function getStationConnectionsJson(
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
export function parseStringListJson(json: string | null | undefined): string[] {
  if (!json) {
    return [];
  }

  try {
    const parsed = JSON.parse(json);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((item) => String(item).trim()).filter(Boolean);
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
export async function resolveFacilityIds(
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
      throw new Error(`Facility "${name}" does not exist.`);
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
export async function resolveTopPickIds(
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
      throw new Error(`Top pick "${name}" does not exist.`);
    }

    if (!ids.includes(result.id)) {
      ids.push(result.id);
    }
  }

  return ids;
}
export { getStationPlatformsJson } from "../station-platforms";
