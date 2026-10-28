/*
 * Places of a station: ONE table (station_places). A place is a Places catalog record (top_picks) linked to the
 * station with an exit, walking minutes and a location note, plus four flags that say where the website shows it:
 *   is_top_pick   -> website main page / map popup        (top_text, top_caption)
 *   is_thing      -> station page "Things to do"          (thing_text, thing_caption)
 *   is_which_exit -> station page "Which exit?"           (exit_note, other exits)
 *   is_day_trip   -> station page "Day trips"             (travel_time, transport)
 */

export interface StationSightExit {
  exit_id: number;
  note: string | null;
  note_japanese: string | null;
}

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
  is_top_pick: number;
  top_text: string | null;
  top_text_japanese: string | null;
  top_caption: string | null;
  top_caption_japanese: string | null;
  is_thing: number;
  thing_text: string | null;
  thing_text_japanese: string | null;
  thing_caption: string | null;
  thing_caption_japanese: string | null;
  is_which_exit: number;
  exit_note: string | null;
  exit_note_japanese: string | null;
  is_day_trip: number;
  travel_time: string | null;
  travel_time_japanese: string | null;
  transport: string | null;
  transport_japanese: string | null;
  /** Other exits of a "Which exit?" place (the main exit is exit_id). */
  extra_exits: StationSightExit[];
}

export async function getStationSights(db: D1Database, stationId: number): Promise<StationSight[]> {
  const r = await db
    .prepare(
      `SELECT tp.id AS top_pick_id, tp.name, tp.name_japanese, tp.slug, tp.category, tp.kind, tp.kind_japanese,
              tp.entry_fee, tp.entry_fee_japanese, tp.description, tp.description_japanese, tp.map_url, tp.image_url,
              l.exit_id, e.name AS exit_name, e.name_japanese AS exit_name_japanese, l.floor_id, l.location_type,
              l.walking_minutes, l.location, l.location_japanese, l.sort_order,
              l.is_top_pick, l.top_text, l.top_text_japanese, l.top_caption, l.top_caption_japanese,
              l.is_thing, l.thing_text, l.thing_text_japanese, l.thing_caption, l.thing_caption_japanese,
              l.is_which_exit, l.exit_note, l.exit_note_japanese,
              l.is_day_trip, l.travel_time, l.travel_time_japanese, l.transport, l.transport_japanese
       FROM station_places l
       JOIN top_picks tp ON tp.id = l.top_pick_id
       LEFT JOIN station_exits e ON e.id = l.exit_id
       WHERE l.station_id = ?
       ORDER BY l.sort_order, tp.name`,
    )
    .bind(stationId)
    .all<Omit<StationSight, "extra_exits">>();
  const links = await db
    .prepare(`SELECT top_pick_id, exit_id, note, note_japanese FROM station_place_exits WHERE station_id = ? ORDER BY exit_id`)
    .bind(stationId)
    .all<StationSightExit & { top_pick_id: number }>();
  const byPlace = new Map<number, StationSightExit[]>();
  for (const l of links.results ?? []) {
    const list = byPlace.get(l.top_pick_id) ?? [];
    list.push({ exit_id: l.exit_id, note: l.note, note_japanese: l.note_japanese });
    byPlace.set(l.top_pick_id, list);
  }
  return (r.results ?? []).map((s) => ({
    ...s,
    extra_exits: (byPlace.get(s.top_pick_id) ?? []).filter((x) => x.exit_id !== s.exit_id),
  }));
}

/** Places that are not on this station yet. */
export async function getUnlinkedSights(db: D1Database, stationId: number): Promise<{ id: number; name: string; category: string }[]> {
  const r = await db
    .prepare(
      `SELECT id, name, category FROM top_picks
       WHERE id NOT IN (SELECT top_pick_id FROM station_places WHERE station_id = ?) ORDER BY name`,
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
  top: { on: boolean; text: string | null; textJa: string | null; caption: string | null; captionJa: string | null };
  thing: { on: boolean; text: string | null; textJa: string | null; caption: string | null; captionJa: string | null };
  whichExit: { on: boolean; note: string | null; noteJa: string | null; extraExitIds: number[] };
  dayTrip: { on: boolean; travelTime: string | null; travelTimeJa: string | null; transport: string | null; transportJa: string | null };
}

async function floorOf(db: D1Database, stationId: number, exitId: number | null): Promise<number | null> {
  if (!exitId) return null;
  const r = await db
    .prepare(`SELECT floor_id FROM station_exits WHERE id = ? AND station_id = ?`)
    .bind(exitId, stationId)
    .first<{ floor_id: number | null }>();
  return r?.floor_id ?? null;
}

/** Values of a part whose flag is off are cleared, so nothing stale is left behind. */
export async function linkSight(db: D1Database, stationId: number, topPickId: number, l: SightLink) {
  const floorId = await floorOf(db, stationId, l.exitId);
  const t = l.top.on, th = l.thing.on, w = l.whichExit.on, d = l.dayTrip.on;
  const keepNotes = await db
    .prepare(`SELECT exit_id, note, note_japanese FROM station_place_exits WHERE station_id = ? AND top_pick_id = ?`)
    .bind(stationId, topPickId)
    .all<StationSightExit>();
  const old = new Map((keepNotes.results ?? []).map((x) => [x.exit_id, x]));
  const extras = w ? [...new Set(l.whichExit.extraExitIds)].filter((id) => id !== l.exitId) : [];

  await db.batch([
    db
      .prepare(
        `INSERT INTO station_places
           (station_id, top_pick_id, sort_order, walking_minutes, floor_id, exit_id, location_type, location, location_japanese,
            is_top_pick, top_text, top_text_japanese, top_caption, top_caption_japanese,
            is_thing, thing_text, thing_text_japanese, thing_caption, thing_caption_japanese,
            is_which_exit, exit_note, exit_note_japanese,
            is_day_trip, travel_time, travel_time_japanese, transport, transport_japanese)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (station_id, top_pick_id) DO UPDATE SET
           sort_order = excluded.sort_order, walking_minutes = excluded.walking_minutes, floor_id = excluded.floor_id,
           exit_id = excluded.exit_id, location_type = excluded.location_type,
           location = excluded.location, location_japanese = excluded.location_japanese,
           is_top_pick = excluded.is_top_pick, top_text = excluded.top_text, top_text_japanese = excluded.top_text_japanese,
           top_caption = excluded.top_caption, top_caption_japanese = excluded.top_caption_japanese,
           is_thing = excluded.is_thing, thing_text = excluded.thing_text, thing_text_japanese = excluded.thing_text_japanese,
           thing_caption = excluded.thing_caption, thing_caption_japanese = excluded.thing_caption_japanese,
           is_which_exit = excluded.is_which_exit, exit_note = excluded.exit_note, exit_note_japanese = excluded.exit_note_japanese,
           is_day_trip = excluded.is_day_trip, travel_time = excluded.travel_time, travel_time_japanese = excluded.travel_time_japanese,
           transport = excluded.transport, transport_japanese = excluded.transport_japanese`,
      )
      .bind(
        stationId, topPickId, l.sortOrder, l.walkingMinutes, floorId, l.exitId, l.locationType, l.location, l.locationJapanese,
        t ? 1 : 0, t ? l.top.text : null, t ? l.top.textJa : null, t ? l.top.caption : null, t ? l.top.captionJa : null,
        th ? 1 : 0, th ? l.thing.text : null, th ? l.thing.textJa : null, th ? l.thing.caption : null, th ? l.thing.captionJa : null,
        w ? 1 : 0, w ? l.whichExit.note : null, w ? l.whichExit.noteJa : null,
        d ? 1 : 0, d ? l.dayTrip.travelTime : null, d ? l.dayTrip.travelTimeJa : null, d ? l.dayTrip.transport : null, d ? l.dayTrip.transportJa : null,
      ),
    db.prepare(`DELETE FROM station_place_exits WHERE station_id = ? AND top_pick_id = ?`).bind(stationId, topPickId),
    ...extras.map((exitId) =>
      db
        .prepare(`INSERT INTO station_place_exits (station_id, top_pick_id, exit_id, note, note_japanese) VALUES (?, ?, ?, ?, ?)`)
        .bind(stationId, topPickId, exitId, old.get(exitId)?.note ?? null, old.get(exitId)?.note_japanese ?? null),
    ),
  ]);
}

/** Takes the place off this station (the place itself stays in Places). */
export async function unlinkSight(db: D1Database, stationId: number, topPickId: number) {
  await db.batch([
    db.prepare(`DELETE FROM station_place_exits WHERE station_id = ? AND top_pick_id = ?`).bind(stationId, topPickId),
    db.prepare(`DELETE FROM station_places WHERE station_id = ? AND top_pick_id = ?`).bind(stationId, topPickId),
  ]);
}
