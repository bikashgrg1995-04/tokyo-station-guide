/* ========================================
   Create, update and delete stations
======================================== */

import type { CreateStationInput, UpdateStationInput } from "./types";
import { resolveTopPickIds } from "./relations";

/* ========================================
   Create Station
======================================== */

export async function createStation(
  db: D1Database,
  input: CreateStationInput,
): Promise<number> {
  // New stations are created without facility assignments.
  const topPickIds =
    input.topPickIds ?? (await resolveTopPickIds(db, input.topPicks));

  const result = await db
    .prepare(
      `
        INSERT INTO stations (
          name,
          name_japanese,
          slug,
          location_url,
          description,
          description_japanese,
          about,
          about_japanese,
          region,
          region_japanese,
          main_image,
          is_verified,
          verified_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CASE
          WHEN ? = 1 THEN COALESCE(?, date('now'))
          ELSE NULL
        END)
      `,
    )
    .bind(
      input.name.trim(),
      input.nameJapanese?.trim() || null,
      input.slug.trim(),
      input.locationUrl?.trim() || null,
      input.description?.trim() || null,
      input.descriptionJapanese?.trim() || null,
      input.about?.trim() || null,
      input.aboutJapanese?.trim() || null,
      input.region?.trim() || null,
      input.regionJapanese?.trim() || null,
      input.mainImage || null,
      input.isVerified ? 1 : 0,
      input.isVerified ? 1 : 0,
      input.verifiedAt || null,
    )
    .run();

  const stationId = Number(result.meta.last_row_id);

  const statements: D1PreparedStatement[] = [];

  topPickIds.forEach((topPickId, index) => {
    statements.push(
      db
        .prepare(
          `
            INSERT INTO station_top_picks (
              station_id,
              top_pick_id,
              sort_order,
              walking_minutes
            )
            VALUES (?, ?, ?, NULL)
          `,
        )
        .bind(stationId, topPickId, index + 1),
    );
  });

  if (statements.length > 0) {
    await db.batch(statements);
  }

  return stationId;
}

/* ========================================
   Update Station
======================================== */

export async function updateStation(
  db: D1Database,
  id: number,
  input: UpdateStationInput,
): Promise<void> {
  /*
   * Top picks are only changed when the caller sends a list. The station edit
   * form does not manage them (they are assigned from the Top Pick pages), so
   * an edit that leaves them out must keep every assignment as it is.
   */
  const syncTopPicks =
    input.topPickIds !== undefined || input.topPicks !== undefined;

  const topPickIds = syncTopPicks
    ? (input.topPickIds ?? (await resolveTopPickIds(db, input.topPicks)))
    : [];

  await db
    .prepare(
      `
        UPDATE stations
        SET
          name = ?,
          name_japanese = ?,
          slug = ?,
          location_url = ?,
          description = ?,
          description_japanese = ?,
          about = ?,
          about_japanese = ?,
          region = ?,
          region_japanese = ?,
          main_image = CASE WHEN ? = 1 THEN ? ELSE main_image END,
          is_verified = COALESCE(?, is_verified),
          verified_at = CASE
            WHEN ? = 0 THEN NULL
            WHEN ? = 1 THEN COALESCE(?, verified_at, date('now'))
            ELSE verified_at
          END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
    )
    .bind(
      input.name.trim(),
      input.nameJapanese?.trim() || null,
      input.slug.trim(),
      input.locationUrl?.trim() || null,
      input.description?.trim() || null,
      input.descriptionJapanese?.trim() || null,
      input.about?.trim() || null,
      input.aboutJapanese?.trim() || null,
      input.region?.trim() || null,
      input.regionJapanese?.trim() || null,
      input.mainImage === undefined ? 0 : 1,
      input.mainImage ?? null,
      input.isVerified === undefined ? null : input.isVerified ? 1 : 0,
      input.isVerified === undefined ? null : input.isVerified ? 1 : 0,
      input.isVerified === undefined ? null : input.isVerified ? 1 : 0,
      input.verifiedAt || null,
      id,
    )
    .run();

  const statements: D1PreparedStatement[] = [];

  /*
   * Replace floor-wise facility assignments only when the caller
   * explicitly supplies stationFacilities.
   */
  if (input.stationFacilities !== undefined) {
    // Delete existing assignments. Their exit links are removed
    // automatically through ON DELETE CASCADE.
    statements.push(
      db
        .prepare(
          `
            DELETE FROM station_floor_facilities
            WHERE floor_id IN (
              SELECT id
              FROM station_floors
              WHERE station_id = ?
            )
          `,
        )
        .bind(id),
    );

    // Insert the new facility assignments first.
    input.stationFacilities.forEach((facility, index) => {
      statements.push(
        db
          .prepare(
            `
              INSERT INTO station_floor_facilities (
                floor_id,
                facility_id,
                note,
                note_japanese,
                facility_count,
                location_type,
                sort_order
              )
              SELECT ?, ?, ?, ?, ?, ?, ?
              WHERE EXISTS (
                SELECT 1
                FROM station_floors
                WHERE id = ?
                  AND station_id = ?
              )
            `,
          )
          .bind(
            facility.floorId,
            facility.facilityId,
            facility.note?.trim() || null,
            facility.noteJapanese?.trim() || null,
            facility.facilityCount,
            facility.locationType === "outside" ? "outside" : "inside",
            index,
            facility.floorId,
            id,
          ),
      );
    });

    // Insert the exit relationships after the assignment inserts.
    // D1 batch statements execute in order.
    input.stationFacilities.forEach((facility) => {
      const exitIds = [...new Set(facility.exitIds ?? [])];

      exitIds.forEach((exitId) => {
        statements.push(
          db
            .prepare(
              `
                INSERT INTO station_floor_facility_exits (
                  station_floor_facility_id,
                  station_exit_id
                )
                SELECT sff.id, se.id
                FROM station_floor_facilities sff
                INNER JOIN station_floors sf
                  ON sf.id = sff.floor_id
                INNER JOIN station_exits se
                  ON se.id = ?
                WHERE sff.floor_id = ?
                  AND sff.facility_id = ?
                  AND sf.station_id = ?
                  AND se.station_id = ?
                ON CONFLICT (
                  station_floor_facility_id,
                  station_exit_id
                ) DO NOTHING
              `,
            )
            .bind(
              exitId,
              facility.floorId,
              facility.facilityId,
              id,
              id,
            ),
        );
      });
    });
  }

  if (syncTopPicks) {
    /*
     * Remove only the picks that were taken off the list, and keep the rows
     * that stay: they carry the floor, exit, location and walking time that
     * were set on the Top Pick pages.
     */
    const keep = topPickIds.map(() => "?").join(", ");

    statements.push(
      db
        .prepare(
          keep
            ? `DELETE FROM station_top_picks
               WHERE station_id = ? AND top_pick_id NOT IN (${keep})`
            : `DELETE FROM station_top_picks WHERE station_id = ?`,
        )
        .bind(id, ...topPickIds),
    );

    topPickIds.forEach((topPickId, index) => {
      statements.push(
        db
          .prepare(
            `
              INSERT INTO station_top_picks (
                station_id,
                top_pick_id,
                sort_order,
                walking_minutes
              )
              VALUES (?, ?, ?, NULL)
              ON CONFLICT (station_id, top_pick_id)
              DO UPDATE SET sort_order = excluded.sort_order
            `,
          )
          .bind(id, topPickId, index + 1),
      );
    });
  }

  if (statements.length > 0) {
    await db.batch(statements);
  }
}

/* ========================================
   Delete Station
======================================== */

export async function deleteStation(
  db: D1Database,
  id: number,
): Promise<void> {
  await db.batch([
    db
      .prepare(
        `
          DELETE FROM station_floor_facilities
          WHERE floor_id IN (
            SELECT id
            FROM station_floors
            WHERE station_id = ?
          )
        `,
      )
      .bind(id),

    db
      .prepare(
        `
          DELETE FROM station_floors
          WHERE station_id = ?
        `,
      )
      .bind(id),

    db
      .prepare(
        `
          DELETE FROM station_top_picks
          WHERE station_id = ?
        `,
      )
      .bind(id),

    db
      .prepare(
        `
          DELETE FROM line_stations
          WHERE station_id = ?
        `,
      )
      .bind(id),

    db
      .prepare(
        `
          DELETE FROM stations
          WHERE id = ?
        `,
      )
      .bind(id),
  ]);
}