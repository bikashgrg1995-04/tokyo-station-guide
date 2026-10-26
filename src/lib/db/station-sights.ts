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

export async function getStationSights(db: D1Database, stationId: number): Promise<StationSight[]> {
  const r = await db
    .prepare(
      `SELECT tp.id AS top_pick_id, tp.name, tp.name_japanese, tp.slug, tp.category, tp.kind, tp.kind_japanese,
              tp.entry_fee, tp.entry_fee_japanese, tp.description, tp.description_japanese, tp.map_url, tp.image_url,
              l.exit_id, e.name AS exit_name, e.name_japanese AS exit_name_japanese, l.floor_id,
              l.walking_minutes, l.location_type, l.location, l.location_japanese, l.sort_order
       FROM station_top_picks l
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
export async function getUnlinkedSights(db: D1Database, stationId: number): Promise<{ id: number; name: string }[]> {
  const r = await db
    .prepare(
      `SELECT id, name FROM top_picks
       WHERE id NOT IN (SELECT top_pick_id FROM station_top_picks WHERE station_id = ?) ORDER BY name`,
    )
    .bind(stationId)
    .all<{ id: number; name: string }>();
  return r.results ?? [];
}

export interface SightFields {
  name: string;
  nameJapanese: string | null;
  kind: string | null;
  kindJapanese: string | null;
  category: string;
  entryFee: string | null;
  entryFeeJapanese: string | null;
  description: string | null;
  descriptionJapanese: string | null;
  mapUrl: string | null;
  /** undefined = keep the stored photo, null = remove it, string = new key */
  image?: string | null;
}

export interface SightLink {
  exitId: number | null;
  walkingMinutes: number | null;
  locationType: string;
  location: string | null;
  locationJapanese: string | null;
  sortOrder: number;
}

async function uniqueSlug(db: D1Database, name: string): Promise<string> {
  const base =
    name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) ||
    `place-${Date.now().toString(36)}`;
  for (let i = 0; i < 50; i++) {
    const slug = i === 0 ? base : `${base}-${i + 1}`;
    const hit = await db.prepare(`SELECT 1 AS x FROM top_picks WHERE slug = ?`).bind(slug).first();
    if (!hit) return slug;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/** The floor of an exit (a link needs both so the map popup can show the floor). */
async function floorOf(db: D1Database, stationId: number, exitId: number | null): Promise<number | null> {
  if (!exitId) return null;
  const r = await db
    .prepare(`SELECT floor_id FROM station_exits WHERE id = ? AND station_id = ?`)
    .bind(exitId, stationId)
    .first<{ floor_id: number | null }>();
  return r?.floor_id ?? null;
}

export async function linkSight(db: D1Database, stationId: number, topPickId: number, l: SightLink) {
  const floorId = await floorOf(db, stationId, l.exitId);
  const exitId = floorId === null ? null : l.exitId;
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

export async function unlinkSight(db: D1Database, stationId: number, topPickId: number) {
  await db.prepare(`DELETE FROM station_top_picks WHERE station_id = ? AND top_pick_id = ?`).bind(stationId, topPickId).run();
}

/** Creates the place (a top pick) and returns its id. */
export async function createSight(db: D1Database, f: SightFields): Promise<number> {
  const slug = await uniqueSlug(db, f.name);
  const r = await db
    .prepare(
      `INSERT INTO top_picks (name, name_japanese, slug, category, kind, kind_japanese, entry_fee, entry_fee_japanese,
                              description, description_japanese, map_url, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(f.name, f.nameJapanese, slug, f.category, f.kind, f.kindJapanese, f.entryFee, f.entryFeeJapanese,
      f.description, f.descriptionJapanese, f.mapUrl, f.image ?? null)
    .run();
  return Number(r.meta.last_row_id);
}

export async function updateSight(db: D1Database, topPickId: number, f: SightFields) {
  const img = f.image === undefined ? "" : ", image_url = ?";
  const params: unknown[] = [f.name, f.nameJapanese, f.category, f.kind, f.kindJapanese, f.entryFee, f.entryFeeJapanese,
    f.description, f.descriptionJapanese, f.mapUrl];
  if (f.image !== undefined) params.push(f.image);
  params.push(topPickId);
  await db
    .prepare(
      `UPDATE top_picks SET name = ?, name_japanese = ?, category = ?, kind = ?, kind_japanese = ?, entry_fee = ?,
              entry_fee_japanese = ?, description = ?, description_japanese = ?, map_url = ?${img}
       WHERE id = ?`,
    )
    .bind(...params)
    .run();
}
