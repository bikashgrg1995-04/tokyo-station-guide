/** Writes of the one facilities table (station_floor_facilities). Reads: getStationFacilities (facilities.ts). */

export interface FacilityEntryInput {
  facilityId: number;
  floorId: number;
  count: number;
  description: string | null;
  descriptionJapanese: string | null;
  locationType: "inside" | "outside" | "inside_outside";
  exitIds: number[];
  photoCaption: string | null;
  photoCaptionJapanese: string | null;
  sortOrder: number;
  /** undefined = keep the stored photo, null = remove it, string = new key */
  photo?: string | null;
}

async function setExits(db: D1Database, stationId: number, entryId: number, exitIds: number[]) {
  const st = [db.prepare(`DELETE FROM station_floor_facility_exits WHERE station_floor_facility_id = ?`).bind(entryId)];
  for (const exitId of [...new Set(exitIds)]) {
    st.push(
      db
        .prepare(
          `INSERT INTO station_floor_facility_exits (station_floor_facility_id, station_exit_id)
           SELECT ?, se.id FROM station_exits se WHERE se.id = ? AND se.station_id = ?`,
        )
        .bind(entryId, exitId, stationId),
    );
  }
  await db.batch(st);
}

export async function createFacilityEntry(db: D1Database, stationId: number, i: FacilityEntryInput) {
  const r = await db
    .prepare(
      `INSERT INTO station_floor_facilities
         (floor_id, facility_id, facility_count, note, note_japanese, location_type, photo, photo_caption, photo_caption_japanese, sort_order)
       SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
       WHERE EXISTS (SELECT 1 FROM station_floors WHERE id = ? AND station_id = ?)`,
    )
    .bind(i.floorId, i.facilityId, i.count, i.description, i.descriptionJapanese, i.locationType, i.photo ?? null,
      i.photoCaption, i.photoCaptionJapanese, i.sortOrder, i.floorId, stationId)
    .run();
  const id = Number(r.meta.last_row_id);
  if (r.meta.changes && id) await setExits(db, stationId, id, i.exitIds);
}

export async function updateFacilityEntry(db: D1Database, stationId: number, id: number, i: FacilityEntryInput) {
  const photoSql = i.photo === undefined ? "" : ", photo = ?";
  const params: unknown[] = [i.floorId, i.facilityId, i.count, i.description, i.descriptionJapanese, i.locationType,
    i.photoCaption, i.photoCaptionJapanese, i.sortOrder];
  if (i.photo !== undefined) params.push(i.photo);
  params.push(id, stationId);
  await db
    .prepare(
      `UPDATE station_floor_facilities
       SET floor_id = ?, facility_id = ?, facility_count = ?, note = ?, note_japanese = ?, location_type = ?,
           photo_caption = ?, photo_caption_japanese = ?, sort_order = ?${photoSql}
       WHERE id = ? AND floor_id IN (SELECT id FROM station_floors WHERE station_id = ?)`,
    )
    .bind(...params)
    .run();
  await setExits(db, stationId, id, i.exitIds);
}

export async function deleteFacilityEntry(db: D1Database, stationId: number, id: number) {
  await db
    .prepare(
      `DELETE FROM station_floor_facilities
       WHERE id = ? AND floor_id IN (SELECT id FROM station_floors WHERE station_id = ?)`,
    )
    .bind(id, stationId)
    .run();
}
