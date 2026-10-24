export interface ExitPhoto {
  id: number;
  title: string;
  title_japanese: string | null;
  caption: string | null;
  caption_japanese: string | null;
  image: string | null;
  sort_order: number;
}

export interface ExitPhotoInput {
  title: string;
  titleJapanese: string | null;
  caption: string | null;
  captionJapanese: string | null;
  sortOrder: number;
}

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

export async function getExitPhotos(db: D1Database, stationId: number): Promise<ExitPhoto[]> {
  const r = await db
    .prepare(
      `SELECT id, title, title_japanese, caption, caption_japanese, image, sort_order
       FROM station_exit_photos WHERE station_id = ? ORDER BY sort_order, id`,
    )
    .bind(stationId)
    .all<ExitPhoto>();
  return r.results ?? [];
}

export async function createExitPhoto(db: D1Database, stationId: number, i: ExitPhotoInput, image: string | null) {
  await db
    .prepare(
      `INSERT INTO station_exit_photos (station_id, title, title_japanese, caption, caption_japanese, image, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(stationId, i.title, i.titleJapanese, i.caption, i.captionJapanese, image, i.sortOrder)
    .run();
}

/** image: undefined = keep the saved photo, null = remove it, string = new key. */
export async function updateExitPhoto(
  db: D1Database,
  stationId: number,
  id: number,
  i: ExitPhotoInput,
  image: string | null | undefined,
) {
  await db
    .prepare(
      `UPDATE station_exit_photos SET title = ?, title_japanese = ?, caption = ?, caption_japanese = ?,
              sort_order = ?, ${image === undefined ? "" : "image = ?,"} updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND station_id = ?`,
    )
    .bind(
      i.title, i.titleJapanese, i.caption, i.captionJapanese, i.sortOrder,
      ...(image === undefined ? [] : [image]), id, stationId,
    )
    .run();
}

export async function deleteExitPhoto(db: D1Database, stationId: number, id: number) {
  await db.prepare(`DELETE FROM station_exit_photos WHERE id = ? AND station_id = ?`).bind(id, stationId).run();
}

export async function getStationTips(db: D1Database, stationId: number): Promise<StationTip[]> {
  const r = await db
    .prepare(`SELECT id, tip, tip_japanese, sort_order FROM station_tips WHERE station_id = ? ORDER BY sort_order, id`)
    .bind(stationId)
    .all<StationTip>();
  return r.results ?? [];
}

export async function createStationTip(db: D1Database, stationId: number, i: StationTipInput) {
  await db
    .prepare(`INSERT INTO station_tips (station_id, tip, tip_japanese, sort_order) VALUES (?, ?, ?, ?)`)
    .bind(stationId, i.tip, i.tipJapanese, i.sortOrder)
    .run();
}

export async function updateStationTip(db: D1Database, stationId: number, id: number, i: StationTipInput) {
  await db
    .prepare(
      `UPDATE station_tips SET tip = ?, tip_japanese = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND station_id = ?`,
    )
    .bind(i.tip, i.tipJapanese, i.sortOrder, id, stationId)
    .run();
}

export async function deleteStationTip(db: D1Database, stationId: number, id: number) {
  await db.prepare(`DELETE FROM station_tips WHERE id = ? AND station_id = ?`).bind(id, stationId).run();
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
