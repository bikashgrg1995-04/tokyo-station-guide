export interface DayTrip {
  id: number;
  name: string;
  name_japanese: string | null;
  travel_time: string | null;
  travel_time_japanese: string | null;
  transport: string | null;
  transport_japanese: string | null;
  description: string | null;
  description_japanese: string | null;
  map_url: string | null;
  photo: string | null;
  sort_order: number;
}

export interface DayTripInput {
  name: string;
  nameJapanese: string | null;
  travelTime: string | null;
  travelTimeJapanese: string | null;
  transport: string | null;
  transportJapanese: string | null;
  description: string | null;
  descriptionJapanese: string | null;
  mapUrl: string | null;
  sortOrder: number;
  /** undefined = keep the stored photo, null = remove it, string = new key */
  photo?: string | null;
}

export async function getDayTrips(db: D1Database, stationId: number): Promise<DayTrip[]> {
  const r = await db
    .prepare(
      `SELECT id, name, name_japanese, travel_time, travel_time_japanese, transport, transport_japanese,
              description, description_japanese, map_url, photo, sort_order
       FROM station_day_trips WHERE station_id = ? ORDER BY sort_order, id`,
    )
    .bind(stationId)
    .all<DayTrip>();
  return r.results ?? [];
}

export async function createDayTrip(db: D1Database, stationId: number, i: DayTripInput) {
  await db
    .prepare(
      `INSERT INTO station_day_trips
         (station_id, name, name_japanese, travel_time, travel_time_japanese, transport, transport_japanese,
          description, description_japanese, map_url, photo, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      stationId, i.name, i.nameJapanese, i.travelTime, i.travelTimeJapanese, i.transport, i.transportJapanese,
      i.description, i.descriptionJapanese, i.mapUrl, i.photo ?? null, i.sortOrder,
    )
    .run();
}

export async function updateDayTrip(db: D1Database, stationId: number, id: number, i: DayTripInput) {
  const photo = i.photo !== undefined;
  await db
    .prepare(
      `UPDATE station_day_trips SET name = ?, name_japanese = ?, travel_time = ?, travel_time_japanese = ?,
              transport = ?, transport_japanese = ?, description = ?, description_japanese = ?,
              map_url = ?, sort_order = ?${photo ? ", photo = ?" : ""}, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND station_id = ?`,
    )
    .bind(
      i.name, i.nameJapanese, i.travelTime, i.travelTimeJapanese, i.transport, i.transportJapanese,
      i.description, i.descriptionJapanese, i.mapUrl, i.sortOrder,
      ...(photo ? [i.photo ?? null] : []),
      id, stationId,
    )
    .run();
}

export async function deleteDayTrip(db: D1Database, stationId: number, id: number) {
  await db.prepare(`DELETE FROM station_day_trips WHERE id = ? AND station_id = ?`).bind(id, stationId).run();
}
