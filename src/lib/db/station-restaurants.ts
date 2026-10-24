export interface Restaurant {
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
  photo: string | null;
  sort_order: number;
}

export interface RestaurantInput {
  name: string | null;
  nameJapanese: string | null;
  kind: string | null;
  kindJapanese: string | null;
  location: string | null;
  locationJapanese: string | null;
  description: string | null;
  descriptionJapanese: string | null;
  mapUrl: string | null;
  sortOrder: number;
  /** undefined = keep the stored photo, null = remove it, string = new key */
  photo?: string | null;
}

export async function getRestaurants(db: D1Database, stationId: number): Promise<Restaurant[]> {
  const r = await db
    .prepare(
      `SELECT id, name, name_japanese, kind, kind_japanese, location, location_japanese, description, description_japanese, map_url, photo, sort_order
       FROM station_restaurants WHERE station_id = ? ORDER BY sort_order, id`,
    )
    .bind(stationId)
    .all<Restaurant>();
  return r.results ?? [];
}

export async function createRestaurant(db: D1Database, stationId: number, i: RestaurantInput) {
  await db
    .prepare(
      `INSERT INTO station_restaurants (station_id, name, name_japanese, kind, kind_japanese, location, location_japanese, description, description_japanese, map_url, photo, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(stationId, i.name, i.nameJapanese, i.kind, i.kindJapanese, i.location, i.locationJapanese, i.description, i.descriptionJapanese, i.mapUrl, i.photo ?? null, i.sortOrder)
    .run();
}

export async function updateRestaurant(db: D1Database, stationId: number, id: number, i: RestaurantInput) {
  const photo = i.photo !== undefined;
  await db
    .prepare(
      `UPDATE station_restaurants SET name = ?, name_japanese = ?, kind = ?, kind_japanese = ?, location = ?, location_japanese = ?, description = ?, description_japanese = ?, map_url = ?, sort_order = ?${photo ? ", photo = ?" : ""}, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND station_id = ?`,
    )
    .bind(i.name, i.nameJapanese, i.kind, i.kindJapanese, i.location, i.locationJapanese, i.description, i.descriptionJapanese, i.mapUrl, i.sortOrder, ...(photo ? [i.photo ?? null] : []), id, stationId)
    .run();
}

export async function deleteRestaurant(db: D1Database, stationId: number, id: number) {
  await db.prepare(`DELETE FROM station_restaurants WHERE id = ? AND station_id = ?`).bind(id, stationId).run();
}

export async function getRestaurantsNote(db: D1Database, stationId: number) {
  const row = await db
    .prepare(`SELECT restaurants_note, restaurants_note_japanese FROM stations WHERE id = ?`)
    .bind(stationId)
    .first<{ restaurants_note: string | null; restaurants_note_japanese: string | null }>();
  return { note: row?.restaurants_note ?? "", noteJapanese: row?.restaurants_note_japanese ?? "" };
}

export async function saveRestaurantsNote(db: D1Database, stationId: number, note: string | null, noteJa: string | null) {
  await db
    .prepare(`UPDATE stations SET restaurants_note = ?, restaurants_note_japanese = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .bind(note, noteJa, stationId)
    .run();
}
