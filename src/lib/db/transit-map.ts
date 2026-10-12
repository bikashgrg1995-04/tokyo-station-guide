
/* ========================================
   Transit Map Database Helpers
======================================== */

import { getLines, type Line } from "./lines";
import type { LineStationItem } from "./line-stations";

/* ========================================
   Transit Map Types
======================================== */

export interface TransitMapLine {
  id: number;
  name: string;
  code: string | null;
  color: string;
  operatorId: number;
  operator: string;
  description: string | null;
  shape: "loop" | "u" | "line" | null;
}

export interface TransitMapStation {
  id: number;
  name: string;
  jp: string | null;
  slug: string;
  code: string | null;
  order: number;

  /*
   * Station detail popup fields.
   * Generated from normalized relational tables
   * and returned as JSON strings for the frontend.
   */
  description: string | null;
  about: string | null;
  is_verified: number;
  verified_at: string | null;

  /** JSON: [{ name, slug, icon, icon_dark, floor, count, note }] */
  facilities: string | null;

  /** JSON: [{ name, name_jp, category, description, minutes }] */
  top_picks: string | null;

  /** JSON: [{ name, code, color, type, operator }] */
  connections: string | null;

  /** JSON: [{ number, destinations, notes, line, lineCode, color }] */
  platforms: string | null;
}

export interface TransitSearchStation {
  id: number;
  name: string;
  jp: string | null;
  slug: string;
  codes: string[];
  lines: string[];
}

export interface TransitMapData {
  lines: TransitMapLine[];
  stationsByLine: Record<string, TransitMapStation[]>;
  searchable: TransitSearchStation[];
}

/* ========================================
   Database Row
======================================== */

interface TransitStationRow extends LineStationItem {
  line_id: number | null;
  station_description: string | null;
  station_about: string | null;
  station_is_verified: number;
  station_verified_at: string | null;
  station_facilities: string | null;
  station_top_picks: string | null;
  station_connections: string | null;
  station_platforms: string | null;
}

/* ========================================
   Get Transit Map Data
======================================== */

export async function getTransitMapData(
  db: D1Database,
): Promise<TransitMapData> {
  const lines = await getLines(db);

  const lineMap = new Map(
    lines.map(function (line) {
      return [line.id, line];
    }),
  );

  /*
   * Get all stations and their line relations.
   * LEFT JOIN keeps stations without a line.
   */

  const stationResult = await db
    .prepare(
      `
        SELECT
          ls.id,
          ls.line_id,
          s.id AS station_id,
          s.name AS station_name,
          s.name_japanese AS station_name_japanese,
          s.slug AS station_slug,
          s.description AS station_description,
          s.about AS station_about,
          s.is_verified AS station_is_verified,
          s.verified_at AS station_verified_at,

          /* Facilities */

          (
            SELECT
              json_group_array(
                json_object(
                  'name', facility.name,
                  'slug', facility.slug,
                  'icon', facility.icon,
                  'icon_dark', facility.icon_dark,
                  'floor', facility.floor,
                  'count', facility.facility_count,
                  'note', facility.note
                )
              )
            FROM (
              SELECT
                f.name,
                f.slug,
                f.icon,
                f.icon_dark,
                sf.floor,
                sf.facility_count,
                sf.note
              FROM station_facilities sf
              INNER JOIN facilities f
                ON f.id = sf.facility_id
              WHERE sf.station_id = s.id
              ORDER BY
                f.sort_order ASC,
                f.name ASC
            ) facility
          ) AS station_facilities,

          /* Top Picks */

          (
            SELECT
              json_group_array(
                json_object(
                  'name', top_pick.name,
                  'name_jp', top_pick.name_japanese,
                  'category', top_pick.category,
                  'description', top_pick.description,
                  'minutes', top_pick.walking_minutes
                )
              )
            FROM (
              SELECT
                tp.name,
                tp.name_japanese,
                tp.category,
                tp.description,
                stp.walking_minutes
              FROM station_top_picks stp
              INNER JOIN top_picks tp
                ON tp.id = stp.top_pick_id
              WHERE stp.station_id = s.id
              ORDER BY stp.sort_order ASC
            ) top_pick
          ) AS station_top_picks,

          /* Connections */

          (
            SELECT
              json_group_array(
                json_object(
                  'name', connection.name,
                  'code', connection.code,
                  'color', connection.color,
                  'type', connection.line_type,
                  'operator', connection.operator_name
                )
              )
            FROM (
              SELECT
                l.name,
                l.code,
                l.color,
                l.line_type,
                o.name AS operator_name
              FROM line_stations connection_ls
              INNER JOIN lines l
                ON l.id = connection_ls.line_id
              LEFT JOIN operators o
                ON o.id = l.operator_id
              WHERE connection_ls.station_id = s.id
              ORDER BY
                connection_ls.station_order ASC,
                l.name ASC
            ) connection
          ) AS station_connections,

          /* Platforms */

          (
            SELECT
              json_group_array(
                json_object(
                  'number', platform.platform_number,
                  'destinations', platform.destinations,
                  'notes', platform.notes,
                  'line', platform.line_name,
                  'lineCode', platform.line_code,
                  'color', platform.line_color
                )
              )
            FROM (
              SELECT
                sp.platform_number,
                sp.destinations,
                sp.notes,
                pl.name AS line_name,
                pl.code AS line_code,
                pl.color AS line_color
              FROM station_platforms sp
              LEFT JOIN lines pl
                ON pl.id = sp.line_id
              WHERE sp.station_id = s.id
              ORDER BY
                sp.sort_order ASC,
                sp.platform_number ASC
            ) platform
          ) AS station_platforms,

          ls.station_order,
          ls.station_code

        FROM stations s
        LEFT JOIN line_stations ls
          ON ls.station_id = s.id

        ORDER BY
          s.name ASC,
          ls.station_order ASC
      `,
    )
    .all<TransitStationRow>();

  const rows = stationResult.results;

  /* ======================================
     Build Stations By Line
  ====================================== */

  const stationsByLine: Record<
    string,
    TransitMapStation[]
  > = {};

  for (const line of lines) {
    stationsByLine[String(line.id)] = [];
  }

  for (const row of rows) {
    if (row.line_id === null) {
      continue;
    }

    const lineStations =
      stationsByLine[String(row.line_id)];

    if (!lineStations) {
      continue;
    }

    lineStations.push({
      id: row.station_id,
      name: row.station_name,
      jp: row.station_name_japanese,
      slug: row.station_slug,
      code: row.station_code,
      order: row.station_order,
      description: row.station_description,
      about: row.station_about,
      is_verified: row.station_is_verified,
      verified_at: row.station_verified_at,
      facilities: row.station_facilities,
      top_picks: row.station_top_picks,
      connections: row.station_connections,
      platforms: row.station_platforms,
    });
  }

  /* ======================================
     Build Searchable Stations
  ====================================== */

  const searchableMap = new Map<
    number,
    TransitSearchStation
  >();

  for (const row of rows) {
    let station = searchableMap.get(row.station_id);

    if (!station) {
      station = {
        id: row.station_id,
        name: row.station_name,
        jp: row.station_name_japanese,
        slug: row.station_slug,
        codes: [],
        lines: [],
      };

      searchableMap.set(row.station_id, station);
    }

    const code = row.station_code?.trim();

    if (code && !station.codes.includes(code)) {
      station.codes.push(code);
    }

    if (row.line_id !== null) {
      const line = lineMap.get(row.line_id);

      if (line && !station.lines.includes(line.name)) {
        station.lines.push(line.name);
      }
    }
  }

  const searchable = Array.from(searchableMap.values());

  /* ======================================
     Build Transit Lines
  ====================================== */

  const transitLines: TransitMapLine[] = lines.map(
    (line: Line) => ({
      id: line.id,
      name: line.name,
      code: line.code,
      color: line.color || "#9caf31",
      operatorId: line.operator_id,
      operator: line.operator_name,
      description: line.description,
      shape:
        line.code === "JY" ||
        /yamanote/i.test(line.name)
          ? "loop"
          : null,
    }),
  );

  return {
    lines: transitLines,
    stationsByLine,
    searchable,
  };
}
