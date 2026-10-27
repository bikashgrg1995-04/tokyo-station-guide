/*
 * Sights of a station: ONE list that feeds "Things to do" (station page), "Top picks" (map popup) and
 * "Which exit?". A sight is a top_picks record linked to the station (station_top_picks) with an exit,
 * walking minutes and an optional free-text location.
 */

export interface StationSight {
  top_pick_id: number;
  name: string;
  name_japanese: string | null;
  slug: string;
  category: string;
  kind: string | null;
  kind_japanese: string | null;
  entry_fee: string | null;
  entry_fee_japanese: string | null;
  description: string | null;
  description_japanese: string | null;
  map_url: string | null;
  image_url: string | null;
  exit_id: number | null;
  exit_name: string | null;
  exit_name_japanese: string | null;
  floor_id: number | null;
  walking_minutes: number | null;
  location_type: string;
  location: string | null;
  location_japanese: string | null;
  sort_order: number;
}

/** "top" = Top picks (website main page / map popup, station_top_picks); "thing" = Things to do (station page, station_things). */
export type SightList = "top" | "thing";

export async function getStationSights(db: D1Database, stationId: number, list: SightList = "top"): Promise<StationSight[]> {
  const top = list === "top";
  const r = await db
    .prepare(
      `SELECT tp.id AS top_pick_id, tp.name, tp.name_japanese, tp.slug, tp.category, tp.kind, tp.kind_japanese,
              tp.entry_fee, tp.entry_fee_japanese, tp.description, tp.description_japanese, tp.map_url, tp.image_url,
              l.exit_id, e.name AS exit_name, e.name_japanese AS exit_name_japanese,
              ${top ? "l.floor_id, l.location_type" : "NULL AS floor_id, 'outside' AS location_type"},
              l.walking_minutes, l.location, l.location_japanese, l.sort_order
       FROM ${top ? "station_top_picks" : "station_things"} l
       JOIN top_picks tp ON tp.id = l.top_pick_id
       LEFT JOIN station_exits e ON e.id = l.exit_id
       WHERE l.station_id = ?
       ORDER BY l.sort_order, tp.name`,
    )
    .bind(stationId)
    .all<StationSight>();
  return r.results ?? [];
}

/** Top picks that are not on this station yet (for "use an existing place"). */
export async function getUnlinkedSights(db: D1Database, stationId: number, list: SightList = "top"): Promise<{ id: number; name: string; category: string }[]> {
  const r = await db
    .prepare(
      `SELECT id, name, category FROM top_picks
       WHERE id NOT IN (SELECT top_pick_id FROM ${list === "top" ? "station_top_picks" : "station_things"} WHERE station_id = ?) ORDER BY name`,
    )
    .bind(stationId)
    .all<{ id: number; name: string; category: string }>();
  return r.results ?? [];
}

export interface SightLink {
  exitId: number | null;
  walkingMinutes: number | null;
  locationType: string;
  location: string | null;
  locationJapanese: string | null;
  sortOrder: number;
}

async function floorOf(db: D1Database, stationId: number, exitId: number | null): Promise<number | null> {
  if (!exitId) return null;
  const r = await db
    .prepare(`SELECT floor_id FROM station_exits WHERE id = ? AND station_id = ?`)
    .bind(exitId, stationId)
    .first<{ floor_id: number | null }>();
  return r?.floor_id ?? null;
}

export async function linkSight(db: D1Database, stationId: number, topPickId: number, l: SightLink, list: SightList = "top") {
  const floorId = await floorOf(db, stationId, l.exitId);
  const exitId = floorId === null ? null : l.exitId;
  if (list === "thing") {
    await db
      .prepare(
        `INSERT INTO station_things (station_id, top_pick_id, sort_order, walking_minutes, exit_id, location, location_japanese)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (station_id, top_pick_id) DO UPDATE SET
           sort_order = excluded.sort_order, walking_minutes = excluded.walking_minutes, exit_id = excluded.exit_id,
           location = excluded.location, location_japanese = excluded.location_japanese`,
      )
      .bind(stationId, topPickId, l.sortOrder, l.walkingMinutes, exitId, l.location, l.locationJapanese)
      .run();
    return;
  }
  await db
    .prepare(
      `INSERT INTO station_top_picks
         (station_id, top_pick_id, sort_order, walking_minutes, floor_id, exit_id, location_type, location, location_japanese)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (station_id, top_pick_id) DO UPDATE SET
         sort_order = excluded.sort_order, walking_minutes = excluded.walking_minutes, floor_id = excluded.floor_id,
         exit_id = excluded.exit_id, location_type = excluded.location_type,
         location = excluded.location, location_japanese = excluded.location_japanese`,
    )
    .bind(stationId, topPickId, l.sortOrder, l.walkingMinutes, floorId, exitId, l.locationType, l.location, l.locationJapanese)
    .run();
}

export async function unlinkSight(db: D1Database, stationId: number, topPickId: number, list: SightList = "top") {
  await db
    .prepare(`DELETE FROM ${list === "top" ? "station_top_picks" : "station_things"} WHERE station_id = ? AND top_pick_id = ?`)
    .bind(stationId, topPickId)
    .run();
}
