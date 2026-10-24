export interface PracticalTip {
  id: number;
  tip: string;
  tip_japanese: string | null;
  sort_order: number;
}

export interface PracticalTipInput {
  tip: string;
  tipJapanese: string | null;
  sortOrder: number;
}

export async function getPracticalTips(db: D1Database, stationId: number): Promise<PracticalTip[]> {
  const r = await db
    .prepare(`SELECT id, tip, tip_japanese, sort_order FROM station_practical_tips WHERE station_id = ? ORDER BY sort_order, id`)
    .bind(stationId)
    .all<PracticalTip>();
  return r.results ?? [];
}

export async function createPracticalTip(db: D1Database, stationId: number, i: PracticalTipInput) {
  await db
    .prepare(`INSERT INTO station_practical_tips (station_id, tip, tip_japanese, sort_order) VALUES (?, ?, ?, ?)`)
    .bind(stationId, i.tip, i.tipJapanese, i.sortOrder)
    .run();
}

export async function updatePracticalTip(db: D1Database, stationId: number, id: number, i: PracticalTipInput) {
  await db
    .prepare(
      `UPDATE station_practical_tips SET tip = ?, tip_japanese = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND station_id = ?`,
    )
    .bind(i.tip, i.tipJapanese, i.sortOrder, id, stationId)
    .run();
}

export async function deletePracticalTip(db: D1Database, stationId: number, id: number) {
  await db.prepare(`DELETE FROM station_practical_tips WHERE id = ? AND station_id = ?`).bind(id, stationId).run();
}
