/* ========================================
   Top Pick Station Assignments
======================================== */

import type { TopPickLocationType } from "./top-picks";

export interface TopPickStationAssignment {
  station_id: number;
  station_name: string;
  station_name_japanese: string | null;
  station_slug: string;

  floor_id: number | null;
  floor_name: string | null;
  floor_name_japanese: string | null;

  exit_id: number | null;
  exit_name: string | null;
  exit_code: string | null;

  location_type: TopPickLocationType;
  walking_minutes: number | null;
  sort_order: number;
}

export interface SaveTopPickStationAssignmentInput {
  stationId: number;
  floorId: number | null;
  exitId: number | null;
  locationType: TopPickLocationType;
  walkingMinutes: number | null;
  sortOrder?: number;
}

/* ========================================
   Get Stations Assigned to a Top Pick
======================================== */

export async function getTopPickStationAssignments(
  db: D1Database,
  topPickId: number,
): Promise<TopPickStationAssignment[]> {
  const result = await db
    .prepare(
      `
        SELECT
          stp.station_id,
          s.name AS station_name,
          s.name_japanese AS station_name_japanese,
          s.slug AS station_slug,

          stp.floor_id,
          sf.name AS floor_name,
          sf.name_japanese AS floor_name_japanese,

          stp.exit_id,
          se.name AS exit_name,
          se.code AS exit_code,

          stp.location_type,
          stp.walking_minutes,
          stp.sort_order
        FROM station_top_picks stp
        INNER JOIN stations s
          ON s.id = stp.station_id
        LEFT JOIN station_floors sf
          ON sf.id = stp.floor_id
        LEFT JOIN station_exits se
          ON se.id = stp.exit_id
        WHERE stp.top_pick_id = ?
        ORDER BY s.name ASC, stp.sort_order ASC
      `,
    )
    .bind(topPickId)
    .all<TopPickStationAssignment>();

  return result.results;
}

/* ========================================
   Save or Update an Assignment
======================================== */

export async function saveTopPickStationAssignment(
  db: D1Database,
  topPickId: number,
  input: SaveTopPickStationAssignmentInput,
): Promise<void> {
  const {
    stationId,
    floorId,
    exitId,
    locationType,
    walkingMinutes,
    sortOrder = 0,
  } = input;

  if (!["inside", "outside", "inside_outside"].includes(locationType)) {
    throw new Error("Invalid location type.");
  }

  if (
    walkingMinutes !== null &&
    (!Number.isInteger(walkingMinutes) || walkingMinutes < 0)
  ) {
    throw new Error("Walking minutes must be a non-negative integer.");
  }

  if (!Number.isInteger(sortOrder)) {
    throw new Error("Sort order must be an integer.");
  }

  const station = await db
    .prepare("SELECT id FROM stations WHERE id = ?")
    .bind(stationId)
    .first<{ id: number }>();

  if (!station) {
    throw new Error("The selected station does not exist.");
  }

  if (floorId === null && exitId !== null) {
    throw new Error("Select a floor before selecting an exit.");
  }

  if (floorId !== null) {
    const floor = await db
      .prepare(
        `
          SELECT id
          FROM station_floors
          WHERE id = ? AND station_id = ?
        `,
      )
      .bind(floorId, stationId)
      .first<{ id: number }>();

    if (!floor) {
      throw new Error("The selected floor does not belong to this station.");
    }
  }

  if (exitId !== null) {
    const exit = await db
      .prepare(
        `
          SELECT id
          FROM station_exits
          WHERE id = ?
            AND station_id = ?
            AND floor_id = ?
        `,
      )
      .bind(exitId, stationId, floorId)
      .first<{ id: number }>();

    if (!exit) {
      throw new Error(
        "The selected exit does not belong to this station and floor.",
      );
    }
  }

  const topPick = await db
    .prepare("SELECT id FROM top_picks WHERE id = ?")
    .bind(topPickId)
    .first<{ id: number }>();

  if (!topPick) {
    throw new Error("The selected Top Pick does not exist.");
  }

  await db
    .prepare(
      `
        INSERT INTO station_top_picks (
          station_id,
          top_pick_id,
          sort_order,
          walking_minutes,
          floor_id,
          exit_id,
          location_type
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (station_id, top_pick_id)
        DO UPDATE SET
          sort_order = excluded.sort_order,
          walking_minutes = excluded.walking_minutes,
          floor_id = excluded.floor_id,
          exit_id = excluded.exit_id,
          location_type = excluded.location_type
      `,
    )
    .bind(
      stationId,
      topPickId,
      sortOrder,
      walkingMinutes,
      floorId,
      exitId,
      locationType,
    )
    .run();
}

/* ========================================
   Remove an Assignment
======================================== */

export async function removeTopPickStationAssignment(
  db: D1Database,
  topPickId: number,
  stationId: number,
): Promise<void> {
  await db
    .prepare(
      `
        DELETE FROM station_top_picks
        WHERE top_pick_id = ? AND station_id = ?
      `,
    )
    .bind(topPickId, stationId)
    .run();
}