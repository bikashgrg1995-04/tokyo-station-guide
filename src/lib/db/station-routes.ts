export interface StationRoute {
  id: number;
  station_id: number;
  from_place: string;
  from_place_japanese: string | null;
  route: string | null;
  route_japanese: string | null;
  travel_time: string | null;
  travel_time_japanese: string | null;
  cost: string | null;
  cost_japanese: string | null;
  sort_order: number;
}

export interface StationRouteInput {
  fromPlace: string;
  fromPlaceJapanese: string | null;
  route: string | null;
  routeJapanese: string | null;
  travelTime: string | null;
  travelTimeJapanese: string | null;
  cost: string | null;
  costJapanese: string | null;
  sortOrder: number;
}

export async function getStationRoutes(db: D1Database, stationId: number): Promise<StationRoute[]> {
  const result = await db
    .prepare(
      `SELECT id, station_id, from_place, from_place_japanese, route, route_japanese,
              travel_time, travel_time_japanese, cost, cost_japanese, sort_order
       FROM station_routes WHERE station_id = ? ORDER BY sort_order, id`,
    )
    .bind(stationId)
    .all<StationRoute>();
  return result.results ?? [];
}

const values = (i: StationRouteInput) => [
  i.fromPlace, i.fromPlaceJapanese, i.route, i.routeJapanese,
  i.travelTime, i.travelTimeJapanese, i.cost, i.costJapanese, i.sortOrder,
];

export async function createStationRoute(db: D1Database, stationId: number, i: StationRouteInput) {
  await db
    .prepare(
      `INSERT INTO station_routes (station_id, from_place, from_place_japanese, route, route_japanese,
                                   travel_time, travel_time_japanese, cost, cost_japanese, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(stationId, ...values(i))
    .run();
}

export async function updateStationRoute(db: D1Database, stationId: number, id: number, i: StationRouteInput) {
  await db
    .prepare(
      `UPDATE station_routes SET from_place = ?, from_place_japanese = ?, route = ?, route_japanese = ?,
              travel_time = ?, travel_time_japanese = ?, cost = ?, cost_japanese = ?, sort_order = ?,
              updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND station_id = ?`,
    )
    .bind(...values(i), id, stationId)
    .run();
}

export async function deleteStationRoute(db: D1Database, stationId: number, id: number) {
  await db.prepare(`DELETE FROM station_routes WHERE id = ? AND station_id = ?`).bind(id, stationId).run();
}

export async function getRoutesNote(db: D1Database, stationId: number) {
  const row = await db
    .prepare(`SELECT routes_note, routes_note_japanese FROM stations WHERE id = ?`)
    .bind(stationId)
    .first<{ routes_note: string | null; routes_note_japanese: string | null }>();
  return { note: row?.routes_note ?? "", noteJapanese: row?.routes_note_japanese ?? "" };
}

export async function saveRoutesNote(db: D1Database, stationId: number, note: string | null, noteJa: string | null) {
  await db
    .prepare(`UPDATE stations SET routes_note = ?, routes_note_japanese = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .bind(note, noteJa, stationId)
    .run();
}
