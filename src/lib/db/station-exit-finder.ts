/** "Which exit?": exits per side, and the places each exit is the way to. */

export const EXIT_PLACE_CATEGORIES = ["transport", "help"] as const;
export type ExitPlaceCategory = (typeof EXIT_PLACE_CATEGORIES)[number];

export const EXIT_PLACE_CATEGORY_LABELS: Record<string, string> = {
  sights: "Sights",
  food: "Food & shops",
  hotels: "Hotels",
  transport: "Transport",
  help: "Help",
};

export interface ExitPlaceExit {
  exit_id: number;
  note: string | null;
  note_japanese: string | null;
}

export interface ExitPlace {
  id: number;
  name: string;
  name_japanese: string | null;
  category: ExitPlaceCategory;
  sort_order: number;
  exits: ExitPlaceExit[];
}

export interface ExitPlaceInput {
  name: string;
  nameJapanese: string | null;
  category: ExitPlaceCategory;
  sortOrder: number;
  exits: { exitId: number; note: string | null; noteJapanese: string | null }[];
}

/* ---------- side <-> exit links ---------- */

export async function getSideExitIds(db: D1Database, stationId: number): Promise<Record<number, number[]>> {
  const r = await db
    .prepare(
      `SELECT se.side_id, se.exit_id
       FROM station_side_exits se JOIN station_sides s ON s.id = se.side_id
       WHERE s.station_id = ?`,
    )
    .bind(stationId)
    .all<{ side_id: number; exit_id: number }>();
  const map: Record<number, number[]> = {};
  for (const row of r.results ?? []) (map[row.side_id] ??= []).push(row.exit_id);
  return map;
}

/** Replace the exits of one side. Only exits of the same station are kept. */
export async function setSideExits(db: D1Database, stationId: number, sideId: number, exitIds: number[]) {
  const valid = await db
    .prepare(`SELECT id FROM station_exits WHERE station_id = ?`)
    .bind(stationId)
    .all<{ id: number }>();
  const ok = new Set((valid.results ?? []).map((e) => e.id));
  const ids = [...new Set(exitIds)].filter((id) => ok.has(id));
  await db.batch([
    db.prepare(`DELETE FROM station_side_exits WHERE side_id = ?`).bind(sideId),
    ...ids.map((id) =>
      db.prepare(`INSERT INTO station_side_exits (side_id, exit_id) VALUES (?, ?)`).bind(sideId, id),
    ),
  ]);
}

/* ---------- places ---------- */

export async function getExitPlaces(db: D1Database, stationId: number): Promise<ExitPlace[]> {
  const places = await db
    .prepare(
      `SELECT id, name, name_japanese, category, sort_order
       FROM station_exit_places WHERE station_id = ? AND category IN ('transport', 'help') ORDER BY sort_order, id`,
    )
    .bind(stationId)
    .all<Omit<ExitPlace, "exits">>();
  const links = await db
    .prepare(
      `SELECT pe.place_id, pe.exit_id, pe.note, pe.note_japanese
       FROM station_exit_place_exits pe JOIN station_exit_places p ON p.id = pe.place_id
       WHERE p.station_id = ?`,
    )
    .bind(stationId)
    .all<ExitPlaceExit & { place_id: number }>();
  const byPlace = new Map<number, ExitPlaceExit[]>();
  for (const l of links.results ?? []) {
    const list = byPlace.get(l.place_id) ?? [];
    list.push({ exit_id: l.exit_id, note: l.note, note_japanese: l.note_japanese });
    byPlace.set(l.place_id, list);
  }
  return (places.results ?? []).map((p) => ({ ...p, exits: byPlace.get(p.id) ?? [] }));
}

function linkStatements(db: D1Database, placeId: number, exits: ExitPlaceInput["exits"]) {
  return exits.map((e) =>
    db
      .prepare(`INSERT INTO station_exit_place_exits (place_id, exit_id, note, note_japanese) VALUES (?, ?, ?, ?)`)
      .bind(placeId, e.exitId, e.note, e.noteJapanese),
  );
}

export async function createExitPlace(db: D1Database, stationId: number, i: ExitPlaceInput) {
  const r = await db
    .prepare(
      `INSERT INTO station_exit_places (station_id, name, name_japanese, category, sort_order)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(stationId, i.name, i.nameJapanese, i.category, i.sortOrder)
    .run();
  const id = Number(r.meta.last_row_id);
  const stmts = linkStatements(db, id, i.exits);
  if (stmts.length) await db.batch(stmts);
}

export async function updateExitPlace(db: D1Database, stationId: number, id: number, i: ExitPlaceInput) {
  await db.batch([
    db
      .prepare(
        `UPDATE station_exit_places SET name = ?, name_japanese = ?, category = ?, sort_order = ?,
                updated_at = CURRENT_TIMESTAMP WHERE id = ? AND station_id = ?`,
      )
      .bind(i.name, i.nameJapanese, i.category, i.sortOrder, id, stationId),
    db.prepare(`DELETE FROM station_exit_place_exits WHERE place_id = ?`).bind(id),
    ...linkStatements(db, id, i.exits),
  ]);
}

export async function deleteExitPlace(db: D1Database, stationId: number, id: number) {
  await db.prepare(`DELETE FROM station_exit_places WHERE id = ? AND station_id = ?`).bind(id, stationId).run();
}
