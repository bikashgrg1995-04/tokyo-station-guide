/* ========================================
   Create, update and delete stations
======================================== */

import type {
  CreateStationInput,
  UpdateStationInput,
} from "./types";
import {
  resolveFacilityIds,
  resolveTopPickIds,
} from "./relations";

/* ========================================
   Create Station
======================================== */

export async function createStation(
  db: D1Database,
  input: CreateStationInput,
): Promise<number> {
  /*
   * Validate/resolve relations before creating the station.
   * This prevents creating a station with invalid
   * facility/top-pick references.
   */
  const facilityIds =
    input.facilityIds ?? (await resolveFacilityIds(db, input.facilities));

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


  const stationId = Number(
    result.meta.last_row_id,
  );

  const statements: D1PreparedStatement[] = [];

  facilityIds.forEach((facilityId) => {
    statements.push(
      db
        .prepare(
          `
            INSERT INTO station_facilities (
              station_id,
              facility_id,
              note
            )
            VALUES (?, ?, NULL)
          `,
        )
        .bind(stationId, facilityId),
    );
  });

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
        .bind(
          stationId,
          topPickId,
          index + 1,
        ),
    );
  });

  if (statements.length) {
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
   * Resolve relations first so invalid names do not
   * partially modify the station.
   */
  const facilityIds =
    input.facilityIds ?? (await resolveFacilityIds(db, input.facilities));

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
      input.isVerified === undefined
        ? null
        : input.isVerified
          ? 1
          : 0,
      input.isVerified === undefined
        ? null
        : input.isVerified
          ? 1
          : 0,
      input.isVerified === undefined
        ? null
        : input.isVerified
          ? 1
          : 0,
      id,
    )
    .run();

  const statements: D1PreparedStatement[] = [
    db
      .prepare(
        `
          DELETE FROM station_facilities
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
  ];

  facilityIds.forEach((facilityId) => {
    statements.push(
      db
        .prepare(
          `
            INSERT INTO station_facilities (
              station_id,
              facility_id,
              note
            )
            VALUES (?, ?, NULL)
          `,
        )
        .bind(id, facilityId),
    );
  });

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
        .bind(
          id,
          topPickId,
          index + 1,
        ),
    );
  });

  if (statements.length) {
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
          DELETE FROM station_facilities
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
