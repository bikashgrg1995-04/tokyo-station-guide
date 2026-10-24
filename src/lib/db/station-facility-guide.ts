export interface FacilityGuideItem {
  id: number;
  name: string;
  name_japanese: string | null;
  description: string | null;
  description_japanese: string | null;
  photo: string | null;
  photo_caption: string | null;
  photo_caption_japanese: string | null;
  sort_order: number;
}

export interface FacilityGuideInput {
  name: string;
  nameJapanese: string | null;
  description: string | null;
  descriptionJapanese: string | null;
  photoCaption: string | null;
  photoCaptionJapanese: string | null;
  sortOrder: number;
  /** undefined = keep the stored photo, null = remove it, string = new key */
  photo?: string | null;
}

export async function getFacilityGuide(db: D1Database, stationId: number): Promise<FacilityGuideItem[]> {
  const r = await db
    .prepare(
      `SELECT id, name, name_japanese, description, description_japanese, photo, photo_caption,
              photo_caption_japanese, sort_order
       FROM station_facility_guide WHERE station_id = ? ORDER BY sort_order, id`,
    )
    .bind(stationId)
    .all<FacilityGuideItem>();
  return r.results ?? [];
}

export async function createFacilityGuideItem(db: D1Database, stationId: number, i: FacilityGuideInput) {
  await db
    .prepare(
      `INSERT INTO station_facility_guide
         (station_id, name, name_japanese, description, description_japanese, photo, photo_caption,
          photo_caption_japanese, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      stationId, i.name, i.nameJapanese, i.description, i.descriptionJapanese, i.photo ?? null,
      i.photoCaption, i.photoCaptionJapanese, i.sortOrder,
    )
    .run();
}

export async function updateFacilityGuideItem(db: D1Database, stationId: number, id: number, i: FacilityGuideInput) {
  const photo = i.photo !== undefined;
  await db
    .prepare(
      `UPDATE station_facility_guide SET name = ?, name_japanese = ?, description = ?, description_japanese = ?,
              photo_caption = ?, photo_caption_japanese = ?, sort_order = ?${photo ? ", photo = ?" : ""},
              updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND station_id = ?`,
    )
    .bind(
      i.name, i.nameJapanese, i.description, i.descriptionJapanese, i.photoCaption, i.photoCaptionJapanese,
      i.sortOrder, ...(photo ? [i.photo ?? null] : []), id, stationId,
    )
    .run();
}

export async function deleteFacilityGuideItem(db: D1Database, stationId: number, id: number) {
  await db.prepare(`DELETE FROM station_facility_guide WHERE id = ? AND station_id = ?`).bind(id, stationId).run();
}
