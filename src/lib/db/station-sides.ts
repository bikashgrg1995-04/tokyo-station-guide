export interface StationSide {
  id: number;
  station_id: number;
  name: string;
  name_japanese: string | null;
  subtitle: string | null;
  subtitle_japanese: string | null;
  description: string | null;
  description_japanese: string | null;
  sort_order: number;
}

export interface StationSideInput {
  name: string;
  nameJapanese: string | null;
  subtitle: string | null;
  subtitleJapanese: string | null;
  description: string | null;
  descriptionJapanese: string | null;
  sortOrder: number;
}

export async function getStationSides(db: D1Database, stationId: number): Promise<StationSide[]> {
  const result = await db
    .prepare(
      `SELECT id, station_id, name, name_japanese, subtitle, subtitle_japanese,
              description, description_japanese, sort_order
       FROM station_sides WHERE station_id = ? ORDER BY sort_order, id`,
    )
    .bind(stationId)
    .all<StationSide>();
  return result.results ?? [];
}

export async function createStationSide(db: D1Database, stationId: number, i: StationSideInput): Promise<number> {
  const r = await db
    .prepare(
      `INSERT INTO station_sides (station_id, name, name_japanese, subtitle, subtitle_japanese,
                                  description, description_japanese, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(stationId, i.name, i.nameJapanese, i.subtitle, i.subtitleJapanese, i.description, i.descriptionJapanese, i.sortOrder)
    .run();
  return Number(r.meta.last_row_id);
}

export async function updateStationSide(db: D1Database, stationId: number, id: number, i: StationSideInput) {
  await db
    .prepare(
      `UPDATE station_sides SET name = ?, name_japanese = ?, subtitle = ?, subtitle_japanese = ?,
              description = ?, description_japanese = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND station_id = ?`,
    )
    .bind(i.name, i.nameJapanese, i.subtitle, i.subtitleJapanese, i.description, i.descriptionJapanese, i.sortOrder, id, stationId)
    .run();
}

export async function deleteStationSide(db: D1Database, stationId: number, id: number) {
  await db.prepare(`DELETE FROM station_sides WHERE id = ? AND station_id = ?`).bind(id, stationId).run();
}

export async function getSidesNote(db: D1Database, stationId: number) {
  const row = await db
    .prepare(`SELECT sides_note, sides_note_japanese FROM stations WHERE id = ?`)
    .bind(stationId)
    .first<{ sides_note: string | null; sides_note_japanese: string | null }>();
  return { note: row?.sides_note ?? "", noteJapanese: row?.sides_note_japanese ?? "" };
}

export async function saveSidesNote(db: D1Database, stationId: number, note: string | null, noteJa: string | null) {
  await db
    .prepare(`UPDATE stations SET sides_note = ?, sides_note_japanese = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .bind(note, noteJa, stationId)
    .run();
}
