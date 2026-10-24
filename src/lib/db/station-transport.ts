export interface TransportItem {
  id: number;
  place: string;
  place_japanese: string | null;
  service: string | null;
  service_japanese: string | null;
  notes: string | null;
  notes_japanese: string | null;
  photo: string | null;
  photo_title: string | null;
  photo_title_japanese: string | null;
  photo_caption: string | null;
  photo_caption_japanese: string | null;
  sort_order: number;
}

export interface TransportInput {
  place: string;
  placeJapanese: string | null;
  service: string | null;
  serviceJapanese: string | null;
  notes: string | null;
  notesJapanese: string | null;
  photoTitle: string | null;
  photoTitleJapanese: string | null;
  photoCaption: string | null;
  photoCaptionJapanese: string | null;
  sortOrder: number;
  /** undefined = keep the stored photo, null = remove it, string = new key */
  photo?: string | null;
}

export async function getTransport(db: D1Database, stationId: number): Promise<TransportItem[]> {
  const r = await db
    .prepare(
      `SELECT id, place, place_japanese, service, service_japanese, notes, notes_japanese, photo, photo_title,
              photo_title_japanese, photo_caption, photo_caption_japanese, sort_order
       FROM station_transport WHERE station_id = ? ORDER BY sort_order, id`,
    )
    .bind(stationId)
    .all<TransportItem>();
  return r.results ?? [];
}

export async function createTransport(db: D1Database, stationId: number, i: TransportInput) {
  await db
    .prepare(
      `INSERT INTO station_transport
         (station_id, place, place_japanese, service, service_japanese, notes, notes_japanese, photo,
          photo_title, photo_title_japanese, photo_caption, photo_caption_japanese, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      stationId, i.place, i.placeJapanese, i.service, i.serviceJapanese, i.notes, i.notesJapanese,
      i.photo ?? null, i.photoTitle, i.photoTitleJapanese, i.photoCaption, i.photoCaptionJapanese, i.sortOrder,
    )
    .run();
}

export async function updateTransport(db: D1Database, stationId: number, id: number, i: TransportInput) {
  const photo = i.photo !== undefined;
  await db
    .prepare(
      `UPDATE station_transport SET place = ?, place_japanese = ?, service = ?, service_japanese = ?,
              notes = ?, notes_japanese = ?, photo_title = ?, photo_title_japanese = ?, photo_caption = ?,
              photo_caption_japanese = ?, sort_order = ?${photo ? ", photo = ?" : ""}, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND station_id = ?`,
    )
    .bind(
      i.place, i.placeJapanese, i.service, i.serviceJapanese, i.notes, i.notesJapanese, i.photoTitle,
      i.photoTitleJapanese, i.photoCaption, i.photoCaptionJapanese, i.sortOrder,
      ...(photo ? [i.photo ?? null] : []), id, stationId,
    )
    .run();
}

export async function deleteTransport(db: D1Database, stationId: number, id: number) {
  await db.prepare(`DELETE FROM station_transport WHERE id = ? AND station_id = ?`).bind(id, stationId).run();
}
