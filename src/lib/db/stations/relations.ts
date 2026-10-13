/* ========================================
   Station relations (facilities, top picks, connections)
======================================== */

/*
 * Convert floor-wise facility data (station_floors ->
 * station_floor_facilities) into the
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
    .prepare(`
      SELECT
        f.id AS facility_id,
        f.name,
        f.slug,
        f.icon,
        f.icon_dark,
        sf.id AS floor_id,
        sf.name AS floor,
        sf.name_japanese AS floor_japanese,
        sff.facility_count AS count,
        sff.note,
        COALESCE(
          (
            SELECT json_group_array(
              json_object(
                'id', se.id,
                'name', se.name,
                'name_jp', se.name,
                'code', se.code,
                'color', se.color_code
              )
            )
            FROM station_floor_facility_exits sffe
            INNER JOIN station_exits se
              ON se.id = sffe.station_exit_id
            WHERE sffe.station_floor_facility_id = sff.id
          ),
          '[]'
        ) AS exits
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
    `)
    .bind(stationId)
    .all<{
      facility_id: number;
      name: string;
      slug: string;
      icon: string | null;
      icon_dark: string | null;
      floor_id: number;
      floor: string;
      floor_japanese: string | null;
      count: number | null;
      note: string | null;
      exits: string | null;
    }>();

  if (!result.results.length) return null;

  const facilities = result.results.map((facility) => {
    let exits: Array<{
      id: number;
      name: string;
      name_jp: string;
      code: string | null;
      color: string | null;
    }> = [];

    try {
      exits = JSON.parse(facility.exits || "[]");
    } catch {
      exits = [];
    }

    return {
      ...facility,
      exits,
    };
  });

  return JSON.stringify(facilities);
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
