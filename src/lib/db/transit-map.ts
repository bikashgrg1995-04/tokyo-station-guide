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
  name: string;
  jp: string | null;
  slug: string;
  code: string | null;
  order: number;
}

export interface TransitSearchStation {
  name: string;
  jp: string | null;
  slug: string;
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
}

/* ========================================
   Get Transit Map Data
======================================== */

export async function getTransitMapData(
  db: D1Database,
): Promise<TransitMapData> {
  /* ======================================
     Get Lines
  ====================================== */

  const lines = await getLines(db);

  /* ======================================
     Get All Stations + Line Relations

     LEFT JOIN is intentional.

     This keeps stations that currently
     don't belong to any line, just like
     the old getStations() query did.
  ====================================== */

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
      name: row.station_name,
      jp: row.station_name_japanese,
      slug: row.station_slug,
      code: row.station_code,
      order: row.station_order,
    });
  }

  /* ======================================
     Build Searchable Stations

     A station can belong to multiple lines,
     so deduplicate by station id.
  ====================================== */

  const searchableMap = new Map<
    number,
    TransitSearchStation
  >();

  for (const row of rows) {
    if (!searchableMap.has(row.station_id)) {
      searchableMap.set(row.station_id, {
        name: row.station_name,
        jp: row.station_name_japanese,
        slug: row.station_slug,
      });
    }
  }

  const searchable = Array.from(
    searchableMap.values(),
  );

  /* ======================================
     Build Transit Lines
  ====================================== */

  const transitLines: TransitMapLine[] =
    lines.map((line: Line) => ({
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
    }));

  return {
    lines: transitLines,
    stationsByLine,
    searchable,
  };
}