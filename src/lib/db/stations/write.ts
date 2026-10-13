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
          latitude,
          longitude,
          description,
          about,
          is_verified,
          verified_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CASE
          WHEN ? = 1 THEN CURRENT_TIMESTAMP
          ELSE NULL
        END)
      `,
    )
    .bind(
      input.name.trim(),
      input.nameJapanese?.trim() || null,
      input.slug.trim(),
      input.latitude ?? null,
      input.longitude ?? null,
      input.description?.trim() || null,
      input.about?.trim() || null,
      input.isVerified ? 1 : 0,
      input.isVerified ? 1 : 0,
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
  const topPickIds =
    input.topPickIds ?? (await resolveTopPickIds(db, input.topPicks));

  await db
    .prepare(
      `
        UPDATE stations
        SET
          name = ?,
          name_japanese = ?,
          slug = ?,
          latitude = ?,
          longitude = ?,
          description = ?,
          about = ?,
          is_verified = COALESCE(?, is_verified),
          verified_at = CASE
            WHEN ? = 0 THEN NULL
            WHEN ? = 1 AND is_verified = 0 THEN CURRENT_TIMESTAMP
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
      input.latitude ?? null,
      input.longitude ?? null,
      input.description?.trim() || null,
      input.about?.trim() || null,
      input.isVerified === undefined ? null : input.isVerified ? 1 : 0,
      input.isVerified === undefined ? null : input.isVerified ? 1 : 0,
      input.isVerified === undefined ? null : input.isVerified ? 1 : 0,
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
                facility_count,
                sort_order
              )
              SELECT ?, ?, ?, ?, ?
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
            facility.facilityCount,
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

  /*
   * Preserve the existing top-pick update behavior.
   * Floor-wise top-pick assignments are not modified here.
   */
  statements.push(
    db
      .prepare(
        `
          DELETE FROM station_top_picks
          WHERE station_id = ?
        `,
      )
      .bind(id),
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
          `,
        )
        .bind(id, topPickId, index + 1),
    );
  });

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