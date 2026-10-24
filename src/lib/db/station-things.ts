export interface Thing {
  id: number;
  name: string;
  name_japanese: string | null;
  kind: string | null;
  kind_japanese: string | null;
  location: string | null;
  location_japanese: string | null;
  cost: string | null;
  cost_japanese: string | null;
  description: string | null;
  description_japanese: string | null;
  map_url: string | null;
  photo: string | null;
  sort_order: number;
}

export interface ThingInput {
  name: string;
  nameJapanese: string | null;
  kind: string | null;
  kindJapanese: string | null;
  location: string | null;
  locationJapanese: string | null;
  cost: string | null;
  costJapanese: string | null;
  description: string | null;
  descriptionJapanese: string | null;
  mapUrl: string | null;
  sortOrder: number;
  /** undefined = keep the stored photo, null = remove it, string = new key */
  photo?: string | null;
}

export async function getThings(db: D1Database, stationId: number): Promise<Thing[]> {
  const r = await db
    .prepare(
      `SELECT id, name, name_japanese, kind, kind_japanese, location, location_japanese, cost, cost_japanese,
              description, description_japanese, map_url, photo, sort_order
       FROM station_things WHERE station_id = ? ORDER BY sort_order, id`,
    )
    .bind(stationId)
    .all<Thing>();
  return r.results ?? [];
}

export async function createThing(db: D1Database, stationId: number, i: ThingInput) {
  await db
    .prepare(
      `INSERT INTO station_things
         (station_id, name, name_japanese, kind, kind_japanese, location, location_japanese, cost, cost_japanese,
          description, description_japanese, map_url, photo, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      stationId, i.name, i.nameJapanese, i.kind, i.kindJapanese, i.location, i.locationJapanese, i.cost,
      i.costJapanese, i.description, i.descriptionJapanese, i.mapUrl, i.photo ?? null, i.sortOrder,
    )
    .run();
}

export async function updateThing(db: D1Database, stationId: number, id: number, i: ThingInput) {
  const photo = i.photo !== undefined;
  await db
    .prepare(
      `UPDATE station_things SET name = ?, name_japanese = ?, kind = ?, kind_japanese = ?, location = ?,
              location_japanese = ?, cost = ?, cost_japanese = ?, description = ?, description_japanese = ?,
              map_url = ?, sort_order = ?${photo ? ", photo = ?" : ""}, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND station_id = ?`,
    )
    .bind(
      i.name, i.nameJapanese, i.kind, i.kindJapanese, i.location, i.locationJapanese, i.cost, i.costJapanese,
      i.description, i.descriptionJapanese, i.mapUrl, i.sortOrder, ...(photo ? [i.photo ?? null] : []), id, stationId,
    )
    .run();
}

export async function deleteThing(db: D1Database, stationId: number, id: number) {
  await db.prepare(`DELETE FROM station_things WHERE id = ? AND station_id = ?`).bind(id, stationId).run();
}
