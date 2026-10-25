/*
 * Hotels and restaurants: records of their own (like top picks) that are assigned to stations.
 * The same code serves both; `PLACE_KINDS` says which tables each one uses.
 */

export type PlaceKind = "hotel" | "restaurant";

export interface PlaceKindInfo {
  kind: PlaceKind;
  table: "hotels" | "restaurants";
  link: "station_hotels" | "station_restaurants";
  linkCol: "hotel_id" | "restaurant_id";
  label: string;
  plural: string;
  route: "hotels" | "restaurants";
  hasBooking: boolean;
}

export const PLACE_KINDS: Record<PlaceKind, PlaceKindInfo> = {
  hotel: {
    kind: "hotel",
    table: "hotels",
    link: "station_hotels",
    linkCol: "hotel_id",
    label: "Hotel",
    plural: "Hotels",
    route: "hotels",
    hasBooking: true,
  },
  restaurant: {
    kind: "restaurant",
    table: "restaurants",
    link: "station_restaurants",
    linkCol: "restaurant_id",
    label: "Restaurant",
    plural: "Restaurants",
    route: "restaurants",
    hasBooking: false,
  },
};

export interface Place {
  id: number;
  slug: string;
  name: string;
  name_japanese: string | null;
  kind: string | null;
  kind_japanese: string | null;
  description: string | null;
  description_japanese: string | null;
  map_url: string | null;
  booking_url: string | null;
  photo: string | null;
}

export interface PlaceInput {
  slug: string;
  name: string;
  nameJapanese: string | null;
  kind: string | null;
  kindJapanese: string | null;
  description: string | null;
  descriptionJapanese: string | null;
  mapUrl: string | null;
  bookingUrl: string | null;
  /** undefined = keep the stored photo, null = remove it, string = new key */
  photo?: string | null;
}

const COLS = `id, slug, name, name_japanese, kind, kind_japanese, description, description_japanese, map_url, photo`;
const selectCols = (k: PlaceKindInfo) => (k.hasBooking ? `${COLS}, booking_url` : `${COLS}, NULL AS booking_url`);

export async function getPlacesPaginated(
  db: D1Database,
  k: PlaceKindInfo,
  opts: { page: number; perPage: number; search: string },
) {
  const like = `%${opts.search}%`;
  const where = opts.search ? `WHERE name LIKE ?1 OR name_japanese LIKE ?1 OR slug LIKE ?1` : "";
  const bind = opts.search ? [like] : [];

  const total =
    (await db.prepare(`SELECT COUNT(*) AS n FROM ${k.table} ${where}`).bind(...bind).first<{ n: number }>())?.n ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / opts.perPage));
  const currentPage = Math.min(Math.max(1, opts.page), totalPages);

  const rows = await db
    .prepare(
      `SELECT ${selectCols(k)},
              (SELECT COUNT(*) FROM ${k.link} l WHERE l.${k.linkCol} = ${k.table}.id) AS station_count
       FROM ${k.table} ${where} ORDER BY name LIMIT ${opts.perPage} OFFSET ${(currentPage - 1) * opts.perPage}`,
    )
    .bind(...bind)
    .all<Place & { station_count: number }>();

  return { items: rows.results ?? [], totalItems: total, currentPage, totalPages };
}

export async function getPlaceById(db: D1Database, k: PlaceKindInfo, id: number): Promise<Place | null> {
  return db.prepare(`SELECT ${selectCols(k)} FROM ${k.table} WHERE id = ?`).bind(id).first<Place>();
}

export async function getAllPlaces(db: D1Database, k: PlaceKindInfo): Promise<Pick<Place, "id" | "name" | "slug">[]> {
  const r = await db.prepare(`SELECT id, name, slug FROM ${k.table} ORDER BY name`).all<Pick<Place, "id" | "name" | "slug">>();
  return r.results ?? [];
}

export async function createPlace(db: D1Database, k: PlaceKindInfo, i: PlaceInput) {
  const cols = `slug, name, name_japanese, kind, kind_japanese, description, description_japanese, map_url, photo${k.hasBooking ? ", booking_url" : ""}`;
  const ph = k.hasBooking ? "?, ?, ?, ?, ?, ?, ?, ?, ?, ?" : "?, ?, ?, ?, ?, ?, ?, ?, ?";
  await db
    .prepare(`INSERT INTO ${k.table} (${cols}) VALUES (${ph})`)
    .bind(
      i.slug, i.name, i.nameJapanese, i.kind, i.kindJapanese, i.description, i.descriptionJapanese, i.mapUrl,
      i.photo ?? null, ...(k.hasBooking ? [i.bookingUrl] : []),
    )
    .run();
}

export async function updatePlace(db: D1Database, k: PlaceKindInfo, id: number, i: PlaceInput) {
  const photo = i.photo !== undefined;
  await db
    .prepare(
      `UPDATE ${k.table} SET slug = ?, name = ?, name_japanese = ?, kind = ?, kind_japanese = ?, description = ?,
              description_japanese = ?, map_url = ?${k.hasBooking ? ", booking_url = ?" : ""}${photo ? ", photo = ?" : ""},
              updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
    )
    .bind(
      i.slug, i.name, i.nameJapanese, i.kind, i.kindJapanese, i.description, i.descriptionJapanese, i.mapUrl,
      ...(k.hasBooking ? [i.bookingUrl] : []), ...(photo ? [i.photo ?? null] : []), id,
    )
    .run();
}

export async function hasPlaceAssignments(db: D1Database, k: PlaceKindInfo, id: number): Promise<boolean> {
  const r = await db.prepare(`SELECT 1 AS x FROM ${k.link} WHERE ${k.linkCol} = ? LIMIT 1`).bind(id).first();
  return Boolean(r);
}

export async function deletePlace(db: D1Database, k: PlaceKindInfo, id: number) {
  await db.prepare(`DELETE FROM ${k.table} WHERE id = ?`).bind(id).run();
}

/* ---- assignment to stations ---- */

export interface StationPlace {
  place_id: number;
  name: string;
  location: string | null;
  location_japanese: string | null;
  sort_order: number;
}

export async function getStationPlaces(db: D1Database, k: PlaceKindInfo, stationId: number): Promise<StationPlace[]> {
  const r = await db
    .prepare(
      `SELECT p.id AS place_id, p.name, l.location, l.location_japanese, l.sort_order
       FROM ${k.link} l JOIN ${k.table} p ON p.id = l.${k.linkCol}
       WHERE l.station_id = ? ORDER BY l.sort_order, p.name`,
    )
    .bind(stationId)
    .all<StationPlace>();
  return r.results ?? [];
}

export async function assignPlace(
  db: D1Database, k: PlaceKindInfo, stationId: number, placeId: number,
  v: { location: string | null; locationJapanese: string | null; sortOrder: number },
) {
  await db
    .prepare(
      `INSERT INTO ${k.link} (station_id, ${k.linkCol}, location, location_japanese, sort_order)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(station_id, ${k.linkCol}) DO UPDATE SET
         location = excluded.location, location_japanese = excluded.location_japanese, sort_order = excluded.sort_order`,
    )
    .bind(stationId, placeId, v.location, v.locationJapanese, v.sortOrder)
    .run();
}

export async function unassignPlace(db: D1Database, k: PlaceKindInfo, stationId: number, placeId: number) {
  await db.prepare(`DELETE FROM ${k.link} WHERE station_id = ? AND ${k.linkCol} = ?`).bind(stationId, placeId).run();
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
