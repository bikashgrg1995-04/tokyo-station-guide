export interface StationFaq {
  id: number;
  question: string;
  question_japanese: string | null;
  answer: string;
  answer_japanese: string | null;
  sort_order: number;
}

export interface StationFaqInput {
  question: string;
  questionJapanese: string | null;
  answer: string;
  answerJapanese: string | null;
  sortOrder: number;
}

export async function getStationFaqs(db: D1Database, stationId: number): Promise<StationFaq[]> {
  const r = await db
    .prepare(
      `SELECT id, question, question_japanese, answer, answer_japanese, sort_order
       FROM station_faqs WHERE station_id = ? ORDER BY sort_order, id`,
    )
    .bind(stationId)
    .all<StationFaq>();
  return r.results ?? [];
}

export async function createStationFaq(db: D1Database, stationId: number, i: StationFaqInput) {
  await db
    .prepare(
      `INSERT INTO station_faqs (station_id, question, question_japanese, answer, answer_japanese, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(stationId, i.question, i.questionJapanese, i.answer, i.answerJapanese, i.sortOrder)
    .run();
}

export async function updateStationFaq(db: D1Database, stationId: number, id: number, i: StationFaqInput) {
  await db
    .prepare(
      `UPDATE station_faqs SET question = ?, question_japanese = ?, answer = ?, answer_japanese = ?,
              sort_order = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND station_id = ?`,
    )
    .bind(i.question, i.questionJapanese, i.answer, i.answerJapanese, i.sortOrder, id, stationId)
    .run();
}

export async function deleteStationFaq(db: D1Database, stationId: number, id: number) {
  await db.prepare(`DELETE FROM station_faqs WHERE id = ? AND station_id = ?`).bind(id, stationId).run();
}
