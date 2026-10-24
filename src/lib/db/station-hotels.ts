export interface Hotel {
  id: number;
  name: string | null;
  name_japanese: string | null;
  kind: string | null;
  kind_japanese: string | null;
  location: string | null;
  location_japanese: string | null;
  description: string | null;
  description_japanese: string | null;
  map_url: string | null;
  booking_url: string | null;
  photo: string | null;
  sort_order: number;
}

export interface HotelInput {
  name: string | null;
  nameJapanese: string | null;
  kind: string | null;
  kindJapanese: string | null;
  location: string | null;
  locationJapanese: string | null;
  description: string | null;
  descriptionJapanese: string | null;
  mapUrl: string | null;
  bookingUrl: string | null;
  sortOrder: number;
  /** undefined = keep the stored photo, null = remove it, string = new key */
  photo?: string | null;
}

export async function getHotels(db: D1Database, stationId: number): Promise<Hotel[]> {
  const r = await db
    .prepare(
      `SELECT id, name, name_japanese, kind, kind_japanese, location, location_japanese, description, description_japanese, map_url, booking_url, photo, sort_order
       FROM station_hotels WHERE station_id = ? ORDER BY sort_order, id`,
    )
    .bind(stationId)
    .all<Hotel>();
  return r.results ?? [];
}

export async function createHotel(db: D1Database, stationId: number, i: HotelInput) {
  await db
    .prepare(
      `INSERT INTO station_hotels (station_id, name, name_japanese, kind, kind_japanese, location, location_japanese, description, description_japanese, map_url, booking_url, photo, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(stationId, i.name, i.nameJapanese, i.kind, i.kindJapanese, i.location, i.locationJapanese, i.description, i.descriptionJapanese, i.mapUrl, i.bookingUrl, i.photo ?? null, i.sortOrder)
    .run();
}

export async function updateHotel(db: D1Database, stationId: number, id: number, i: HotelInput) {
  const photo = i.photo !== undefined;
  await db
    .prepare(
      `UPDATE station_hotels SET name = ?, name_japanese = ?, kind = ?, kind_japanese = ?, location = ?, location_japanese = ?, description = ?, description_japanese = ?, map_url = ?, booking_url = ?, sort_order = ?${photo ? ", photo = ?" : ""}, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND station_id = ?`,
    )
    .bind(i.name, i.nameJapanese, i.kind, i.kindJapanese, i.location, i.locationJapanese, i.description, i.descriptionJapanese, i.mapUrl, i.bookingUrl, i.sortOrder, ...(photo ? [i.photo ?? null] : []), id, stationId)
    .run();
}

export async function deleteHotel(db: D1Database, stationId: number, id: number) {
  await db.prepare(`DELETE FROM station_hotels WHERE id = ? AND station_id = ?`).bind(id, stationId).run();
}
