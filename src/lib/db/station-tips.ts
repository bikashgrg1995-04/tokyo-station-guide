export interface StationTip {
  id: number;
  tip: string;
  tip_japanese: string | null;
  sort_order: number;
}

export interface StationTipInput {
  tip: string;
  tipJapanese: string | null;
  sortOrder: number;
}

export type TipSection = "exits" | "practical";

export async function getStationTips(db: D1Database, stationId: number, section: TipSection = "exits"): Promise<StationTip[]> {
  const r = await db
    .prepare(`SELECT id, tip, tip_japanese, sort_order FROM station_tips WHERE station_id = ? AND section = ? ORDER BY sort_order, id`)
    .bind(stationId, section)
    .all<StationTip>();
  return r.results ?? [];
}

export async function createStationTip(db: D1Database, stationId: number, i: StationTipInput, section: TipSection = "exits") {
  await db
    .prepare(`INSERT INTO station_tips (station_id, tip, tip_japanese, sort_order, section) VALUES (?, ?, ?, ?, ?)`)
    .bind(stationId, i.tip, i.tipJapanese, i.sortOrder, section)
    .run();
}

export async function updateStationTip(db: D1Database, stationId: number, id: number, i: StationTipInput, section: TipSection = "exits") {
  await db
    .prepare(
      `UPDATE station_tips SET tip = ?, tip_japanese = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND station_id = ? AND section = ?`,
    )
    .bind(i.tip, i.tipJapanese, i.sortOrder, id, stationId, section)
    .run();
}

export async function deleteStationTip(db: D1Database, stationId: number, id: number, section: TipSection = "exits") {
  await db.prepare(`DELETE FROM station_tips WHERE id = ? AND station_id = ? AND section = ?`).bind(id, stationId, section).run();
}

export async function getExitsNote(db: D1Database, stationId: number) {
  const row = await db
    .prepare(`SELECT exits_note, exits_note_japanese FROM stations WHERE id = ?`)
    .bind(stationId)
    .first<{ exits_note: string | null; exits_note_japanese: string | null }>();
  return { note: row?.exits_note ?? "", noteJapanese: row?.exits_note_japanese ?? "" };
}

export async function saveExitsNote(db: D1Database, stationId: number, note: string | null, noteJa: string | null) {
  await db
    .prepare(`UPDATE stations SET exits_note = ?, exits_note_japanese = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .bind(note, noteJa, stationId)
    .run();
}
