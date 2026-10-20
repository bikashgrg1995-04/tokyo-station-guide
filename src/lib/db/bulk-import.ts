import type { ImportOp, ImportSnapshot } from "../import/types";

/** Reads the keys of everything an upload can refer to. */
export async function loadImportSnapshot(db: D1Database): Promise<ImportSnapshot> {
  const all = async <T>(sql: string) =>
    (await db.prepare(sql).all<T>()).results ?? [];

  const [operators, lines, stations, facilities, topPicks, floors, exits, platforms, floorFacilities, stationTopPicks, lineStations] =
    await Promise.all([
      all<{ slug: string; name: string }>("SELECT slug, name FROM operators"),
      all<{ slug: string }>("SELECT slug FROM lines"),
      all<{ slug: string }>("SELECT slug FROM stations"),
      all<{ slug: string; name: string }>("SELECT slug, name FROM facilities"),
      all<{ slug: string }>("SELECT slug FROM top_picks"),
      all<{ k: string }>(
        `SELECT s.slug || '|' || f.name AS k
         FROM station_floors f JOIN stations s ON s.id = f.station_id`,
      ),
      all<{ k: string }>(
        `SELECT s.slug || '|' || e.name AS k
         FROM station_exits e JOIN stations s ON s.id = e.station_id`,
      ),
      all<{ k: string }>(
        `SELECT s.slug || '|' || p.platform_number || '|' || COALESCE(l.slug, '') AS k
         FROM station_platforms p
         JOIN stations s ON s.id = p.station_id
         LEFT JOIN lines l ON l.id = p.line_id`,
      ),
      all<{ k: string }>(
        `SELECT s.slug || '|' || f.name || '|' || fa.slug AS k
         FROM station_floor_facilities sff
         JOIN station_floors f ON f.id = sff.floor_id
         JOIN stations s ON s.id = f.station_id
         JOIN facilities fa ON fa.id = sff.facility_id`,
      ),
      all<{ k: string }>(
        `SELECT s.slug || '|' || t.slug AS k
         FROM station_top_picks stp
         JOIN stations s ON s.id = stp.station_id
         JOIN top_picks t ON t.id = stp.top_pick_id`,
      ),
      all<{ lineSlug: string; stationSlug: string; order: number }>(
        `SELECT l.slug AS lineSlug, s.slug AS stationSlug, ls.station_order AS "order"
         FROM line_stations ls
         JOIN lines l ON l.id = ls.line_id
         JOIN stations s ON s.id = ls.station_id`,
      ),
    ]);

  return {
    operators,
    lines,
    stations,
    facilities,
    topPicks,
    floors: floors.map((r) => r.k),
    exits: exits.map((r) => r.k),
    platforms: platforms.map((r) => r.k),
    floorFacilities: floorFacilities.map((r) => r.k),
    stationTopPicks: stationTopPicks.map((r) => r.k),
    lineStations,
  };
}

/** Order in which operation types are applied (a type only needs the ones before it). */
const TYPE_ORDER: ImportOp["t"][] = [
  "operator",
  "line",
  "station",
  "facility",
  "topPick",
  "lineStation",
  "floor",
  "floorFacility",
  "exit",
  "platform",
  "stationTopPick",
];

function statementsFor(db: D1Database, op: ImportOp): D1PreparedStatement[] {
  const p = (sql: string, ...values: (string | number | null)[]) =>
    db.prepare(sql).bind(...values);

  switch (op.t) {
    case "operator":
      return [
        p(
          `INSERT INTO operators (slug, name, name_japanese, description, description_japanese, website_url)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6)
           ON CONFLICT(slug) DO UPDATE SET
             name = excluded.name,
             name_japanese = COALESCE(?3, operators.name_japanese),
             description = COALESCE(?4, operators.description),
             description_japanese = COALESCE(?5, operators.description_japanese),
             website_url = COALESCE(?6, operators.website_url),
             updated_at = CURRENT_TIMESTAMP`,
          op.slug, op.name, op.nameJa, op.desc, op.descJa, op.url,
        ),
      ];

    case "line":
      return [
        p(
          `INSERT INTO lines
             (operator_id, slug, name, name_japanese, code, color, line_type,
              website_status, is_published, description, description_japanese)
           SELECT o.id, ?1, ?2, ?3, ?4, ?5, COALESCE(?6, 'subway'),
                  COALESCE(?7, 'coming_soon'),
                  CASE WHEN ?7 = 'live' THEN 1 ELSE 0 END, ?8, ?9
           FROM operators o WHERE o.slug = ?10
           ON CONFLICT(slug) DO UPDATE SET
             operator_id = excluded.operator_id,
             name = excluded.name,
             name_japanese = COALESCE(?3, lines.name_japanese),
             code = COALESCE(?4, lines.code),
             color = COALESCE(?5, lines.color),
             line_type = COALESCE(?6, lines.line_type),
             website_status = COALESCE(?7, lines.website_status),
             is_published = COALESCE(CASE WHEN ?7 = 'live' THEN 1 WHEN ?7 IS NOT NULL THEN 0 END, lines.is_published),
             description = COALESCE(?8, lines.description),
             description_japanese = COALESCE(?9, lines.description_japanese),
             updated_at = CURRENT_TIMESTAMP`,
          op.slug, op.name, op.nameJa, op.code, op.color, op.lineType, op.status, op.desc, op.descJa, op.operatorSlug,
        ),
      ];

    case "station":
      return [
        p(
          `INSERT INTO stations
             (slug, name, name_japanese, description, description_japanese, about,
              about_japanese, location_url, is_verified, verified_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, COALESCE(?9, 0), ?10)
           ON CONFLICT(slug) DO UPDATE SET
             name = excluded.name,
             name_japanese = COALESCE(?3, stations.name_japanese),
             description = COALESCE(?4, stations.description),
             description_japanese = COALESCE(?5, stations.description_japanese),
             about = COALESCE(?6, stations.about),
             about_japanese = COALESCE(?7, stations.about_japanese),
             location_url = COALESCE(?8, stations.location_url),
             is_verified = COALESCE(?9, stations.is_verified),
             verified_at = COALESCE(?10, stations.verified_at),
             updated_at = CURRENT_TIMESTAMP`,
          op.slug, op.name, op.nameJa, op.desc, op.descJa, op.about, op.aboutJa, op.locationUrl, op.isVerified, op.verifiedAt,
        ),
      ];

    case "facility":
      return [
        p(
          `INSERT INTO facilities (slug, name, name_japanese, sort_order)
           VALUES (?1, ?2, ?3, COALESCE(?4, 0))
           ON CONFLICT(slug) DO UPDATE SET
             name = excluded.name,
             name_japanese = COALESCE(?3, facilities.name_japanese),
             sort_order = COALESCE(?4, facilities.sort_order)`,
          op.slug, op.name, op.nameJa, op.sortOrder,
        ),
      ];

    case "topPick":
      return [
        p(
          `INSERT INTO top_picks
             (slug, name, name_japanese, category, description, description_japanese,
              entry_fee, entry_fee_japanese, notes, notes_japanese, map_url)
           VALUES (?1, ?2, ?3, COALESCE(?4, 'landmark'), ?5, ?6, ?7, ?8, ?9, ?10, ?11)
           ON CONFLICT(slug) DO UPDATE SET
             name = excluded.name,
             name_japanese = COALESCE(?3, top_picks.name_japanese),
             category = COALESCE(?4, top_picks.category),
             description = COALESCE(?5, top_picks.description),
             description_japanese = COALESCE(?6, top_picks.description_japanese),
             entry_fee = COALESCE(?7, top_picks.entry_fee),
             entry_fee_japanese = COALESCE(?8, top_picks.entry_fee_japanese),
             notes = COALESCE(?9, top_picks.notes),
             notes_japanese = COALESCE(?10, top_picks.notes_japanese),
             map_url = COALESCE(?11, top_picks.map_url)`,
          op.slug, op.name, op.nameJa, op.category, op.desc, op.descJa, op.entryFee, op.entryFeeJa, op.notes, op.notesJa, op.mapUrl,
        ),
      ];

    case "lineStation":
      return [
        // Park the existing row on a negative number first, so a swap of two
        // stations never hits the "unique order per line" rule half way.
        p(
          `UPDATE line_stations SET station_order = -id
           WHERE line_id = (SELECT id FROM lines WHERE slug = ?1)
             AND station_id = (SELECT id FROM stations WHERE slug = ?2)`,
          op.lineSlug, op.stationSlug,
        ),
        p(
          `INSERT INTO line_stations (line_id, station_id, station_order, station_code)
           SELECT l.id, s.id, ?3, ?4
           FROM lines l, stations s WHERE l.slug = ?1 AND s.slug = ?2
           ON CONFLICT(line_id, station_id) DO UPDATE SET
             station_order = excluded.station_order,
             station_code = COALESCE(?4, line_stations.station_code)`,
          op.lineSlug, op.stationSlug, op.order, op.code,
        ),
      ];

    case "floor":
      return [
        p(
          `INSERT INTO station_floors (station_id, name, name_japanese, floor_order)
           SELECT s.id, ?2, ?3, COALESCE(?4, 0) FROM stations s WHERE s.slug = ?1
           ON CONFLICT(station_id, name) DO UPDATE SET
             name_japanese = COALESCE(?3, station_floors.name_japanese),
             floor_order = COALESCE(?4, station_floors.floor_order),
             updated_at = CURRENT_TIMESTAMP`,
          op.stationSlug, op.name, op.nameJa, op.floorOrder,
        ),
      ];

    case "floorFacility":
      return [
        p(
          `INSERT INTO station_floor_facilities
             (floor_id, facility_id, facility_count, note, note_japanese, location_type, sort_order)
           SELECT fl.id, fa.id, ?4, ?5, ?6, COALESCE(?7, 'inside'), COALESCE(?8, 0)
           FROM station_floors fl
           JOIN stations s ON s.id = fl.station_id
           JOIN facilities fa ON fa.slug = ?3
           WHERE s.slug = ?1 AND fl.name = ?2
           ON CONFLICT(floor_id, facility_id) DO UPDATE SET
             facility_count = COALESCE(?4, station_floor_facilities.facility_count),
             note = COALESCE(?5, station_floor_facilities.note),
             note_japanese = COALESCE(?6, station_floor_facilities.note_japanese),
             location_type = COALESCE(?7, station_floor_facilities.location_type),
             sort_order = COALESCE(?8, station_floor_facilities.sort_order)`,
          op.stationSlug, op.floorName, op.facilitySlug, op.count, op.note, op.noteJa, op.locationType, op.sortOrder,
        ),
      ];

    case "exit":
      return [
        p(
          `UPDATE station_exits SET
             floor_id = (SELECT f.id FROM station_floors f WHERE f.station_id = station_exits.station_id AND f.name = ?3),
             name_japanese = COALESCE(?4, name_japanese),
             code = COALESCE(?5, code),
             color_code = COALESCE(?6, color_code),
             description = COALESCE(?7, description),
             description_japanese = COALESCE(?8, description_japanese),
             sort_order = COALESCE(?9, sort_order),
             updated_at = CURRENT_TIMESTAMP
           WHERE station_id = (SELECT id FROM stations WHERE slug = ?1) AND name = ?2`,
          op.stationSlug, op.name, op.floorName, op.nameJa, op.code, op.colorCode, op.desc, op.descJa, op.sortOrder,
        ),
        p(
          `INSERT INTO station_exits
             (station_id, floor_id, name, name_japanese, code, color_code, description, description_japanese, sort_order)
           SELECT s.id, f.id, ?2, ?4, ?5, ?6, ?7, ?8, COALESCE(?9, 0)
           FROM stations s JOIN station_floors f ON f.station_id = s.id AND f.name = ?3
           WHERE s.slug = ?1
             AND NOT EXISTS (SELECT 1 FROM station_exits e WHERE e.station_id = s.id AND e.name = ?2)`,
          op.stationSlug, op.name, op.floorName, op.nameJa, op.code, op.colorCode, op.desc, op.descJa, op.sortOrder,
        ),
      ];

    case "platform":
      return [
        p(
          `UPDATE station_platforms SET
             floor_id = COALESCE((SELECT f.id FROM station_floors f WHERE f.station_id = station_platforms.station_id AND f.name = ?3), floor_id),
             destinations = COALESCE(?4, destinations),
             destinations_japanese = COALESCE(?5, destinations_japanese),
             notes = COALESCE(?6, notes),
             notes_japanese = COALESCE(?7, notes_japanese),
             sort_order = COALESCE(?8, sort_order),
             updated_at = CURRENT_TIMESTAMP
           WHERE station_id = (SELECT id FROM stations WHERE slug = ?1)
             AND platform_number = ?9
             AND line_id IS (SELECT id FROM lines WHERE slug = ?2)`,
          op.stationSlug, op.lineSlug, op.floorName, op.dest, op.destJa, op.notes, op.notesJa, op.sortOrder, op.number,
        ),
        p(
          `INSERT INTO station_platforms
             (station_id, line_id, floor_id, platform_number, destinations,
              destinations_japanese, notes, notes_japanese, sort_order)
           SELECT s.id,
                  (SELECT id FROM lines WHERE slug = ?2),
                  (SELECT f.id FROM station_floors f WHERE f.station_id = s.id AND f.name = ?3),
                  ?9, ?4, ?5, ?6, ?7, COALESCE(?8, 0)
           FROM stations s
           WHERE s.slug = ?1
             AND NOT EXISTS (
               SELECT 1 FROM station_platforms x
               WHERE x.station_id = s.id AND x.platform_number = ?9
                 AND x.line_id IS (SELECT id FROM lines WHERE slug = ?2)
             )`,
          op.stationSlug, op.lineSlug, op.floorName, op.dest, op.destJa, op.notes, op.notesJa, op.sortOrder, op.number,
        ),
      ];

    case "stationTopPick":
      return [
        p(
          `INSERT INTO station_top_picks
             (station_id, top_pick_id, walking_minutes, location_type, sort_order)
           SELECT s.id, t.id, ?3, COALESCE(?4, 'outside'), COALESCE(?5, 0)
           FROM stations s, top_picks t WHERE s.slug = ?1 AND t.slug = ?2
           ON CONFLICT(station_id, top_pick_id) DO UPDATE SET
             walking_minutes = COALESCE(?3, station_top_picks.walking_minutes),
             location_type = COALESCE(?4, station_top_picks.location_type),
             sort_order = COALESCE(?5, station_top_picks.sort_order)`,
          op.stationSlug, op.topPickSlug, op.minutes, op.locationType, op.sortOrder,
        ),
      ];
  }
}

/** Applies every operation in one batch: either all of it is saved, or none. */
export async function applyImportOps(db: D1Database, ops: ImportOp[]): Promise<void> {
  const sorted = [...ops].sort(
    (a, b) => TYPE_ORDER.indexOf(a.t) - TYPE_ORDER.indexOf(b.t),
  );
  const statements = sorted.flatMap((op) => statementsFor(db, op));

  if (statements.length === 0) return;
  await db.batch(statements);
}
