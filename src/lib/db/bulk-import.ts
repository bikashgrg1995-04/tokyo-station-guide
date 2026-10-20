import type { ImportOp, ImportSnapshot, StoredRow } from "../import/types";

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

  const stored = await loadStoredRows(all);

  return {
    stored,
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

type Reader = <T>(sql: string) => Promise<T[]>;

/** Stored values of every importable row, named like the fields of its ImportOp. */
async function loadStoredRows(all: Reader): Promise<ImportSnapshot["stored"]> {
  const keyed = async (sql: string): Promise<Record<string, StoredRow>> => {
    const rows = await all<StoredRow & { k: string }>(sql);
    const out: Record<string, StoredRow> = {};
    for (const { k, ...rest } of rows) out[k] = rest;
    return out;
  };

  const [operator, line, station, lineStation, facility, floor, floorFacility, exit, platform, topPick, stationTopPick] =
    await Promise.all([
      keyed(`SELECT slug AS k, name, name_japanese AS nameJa, description AS "desc",
                    description_japanese AS descJa, website_url AS url FROM operators`),
      keyed(`SELECT l.slug AS k, o.slug AS operatorSlug, l.name, l.name_japanese AS nameJa, l.code,
                    l.color, l.line_type AS lineType, l.website_status AS status,
                    l.description AS "desc", l.description_japanese AS descJa
             FROM lines l JOIN operators o ON o.id = l.operator_id`),
      keyed(`SELECT slug AS k, name, name_japanese AS nameJa, description AS "desc",
                    description_japanese AS descJa, about, about_japanese AS aboutJa,
                    location_url AS locationUrl, is_verified AS isVerified, verified_at AS verifiedAt
             FROM stations`),
      keyed(`SELECT l.slug || '|' || s.slug AS k, ls.station_order AS "order", ls.station_code AS code
             FROM line_stations ls JOIN lines l ON l.id = ls.line_id JOIN stations s ON s.id = ls.station_id`),
      keyed(`SELECT slug AS k, name, name_japanese AS nameJa, sort_order AS sortOrder FROM facilities`),
      keyed(`SELECT s.slug || '|' || f.name AS k, f.name_japanese AS nameJa, f.floor_order AS floorOrder
             FROM station_floors f JOIN stations s ON s.id = f.station_id`),
      keyed(`SELECT s.slug || '|' || f.name || '|' || fa.slug AS k, sff.facility_count AS count,
                    sff.note, sff.note_japanese AS noteJa, sff.location_type AS locationType,
                    sff.sort_order AS sortOrder
             FROM station_floor_facilities sff
             JOIN station_floors f ON f.id = sff.floor_id
             JOIN stations s ON s.id = f.station_id
             JOIN facilities fa ON fa.id = sff.facility_id`),
      keyed(`SELECT s.slug || '|' || e.name AS k, f.name AS floorName, e.name_japanese AS nameJa,
                    e.code, e.color_code AS colorCode, e.description AS "desc",
                    e.description_japanese AS descJa, e.sort_order AS sortOrder
             FROM station_exits e JOIN stations s ON s.id = e.station_id
             LEFT JOIN station_floors f ON f.id = e.floor_id`),
      keyed(`SELECT s.slug || '|' || p.platform_number || '|' || COALESCE(l.slug, '') AS k,
                    f.name AS floorName, p.destinations AS dest, p.destinations_japanese AS destJa,
                    p.notes, p.notes_japanese AS notesJa, p.sort_order AS sortOrder
             FROM station_platforms p JOIN stations s ON s.id = p.station_id
             LEFT JOIN lines l ON l.id = p.line_id
             LEFT JOIN station_floors f ON f.id = p.floor_id`),
      keyed(`SELECT slug AS k, name, name_japanese AS nameJa, category, description AS "desc",
                    description_japanese AS descJa, entry_fee AS entryFee,
                    entry_fee_japanese AS entryFeeJa, notes, notes_japanese AS notesJa,
                    map_url AS mapUrl FROM top_picks`),
      keyed(`SELECT s.slug || '|' || t.slug AS k, stp.walking_minutes AS minutes,
                    stp.location_type AS locationType, stp.sort_order AS sortOrder
             FROM station_top_picks stp JOIN stations s ON s.id = stp.station_id
             JOIN top_picks t ON t.id = stp.top_pick_id`),
    ]);

  return { operator, line, station, lineStation, facility, floor, floorFacility, exit, platform, topPick, stationTopPick };
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

type V = string | number | null | undefined;
type Bind = string | number | null;
/** [column, value, column can never be empty] */
type Pair = [string, V, boolean?];

/** undefined (column not in the file) is stored as empty on a new row. */
const n = (v: V): Bind => (v === undefined ? null : v);

/**
 * "col = ?k" for every column the file actually contains. A column missing from
 * the file keeps its value; an empty cell clears it (except columns that can
 * never be empty, which keep their value).
 */
function sets(pairs: Pair[], firstParam: number) {
  const parts: string[] = [];
  const params: Bind[] = [];
  for (const [col, v, notNull] of pairs) {
    if (v === undefined || (v === null && notNull)) continue;
    params.push(v);
    parts.push(`${col} = ?${firstParam + params.length - 1}`);
  }
  return { sql: parts.map((x) => `, ${x}`).join(""), params };
}

function statementsFor(db: D1Database, op: ImportOp): D1PreparedStatement[] {
  const p = (sql: string, ...values: Bind[]) => db.prepare(sql).bind(...values);

  switch (op.t) {
    case "operator": {
      const u = sets(
        [
          ["name_japanese", op.nameJa],
          ["description", op.desc],
          ["description_japanese", op.descJa],
          ["website_url", op.url],
        ],
        7,
      );
      return [
        p(
          `INSERT INTO operators (slug, name, name_japanese, description, description_japanese, website_url)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6)
           ON CONFLICT(slug) DO UPDATE SET name = excluded.name${u.sql}, updated_at = CURRENT_TIMESTAMP`,
          op.slug, op.name, n(op.nameJa), n(op.desc), n(op.descJa), n(op.url), ...u.params,
        ),
      ];
    }

    case "line": {
      const statusGiven = op.status !== undefined && op.status !== null;
      const u = sets(
        [
          ["name_japanese", op.nameJa],
          ["code", op.code],
          ["color", op.color],
          ["line_type", op.lineType, true],
          ["website_status", op.status, true],
          ["description", op.desc],
          ["description_japanese", op.descJa],
        ],
        11,
      );
      const published = statusGiven
        ? `, is_published = ${op.status === "live" ? 1 : 0}`
        : "";
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
             name = excluded.name${u.sql}${published},
             updated_at = CURRENT_TIMESTAMP`,
          op.slug, op.name, n(op.nameJa), n(op.code), n(op.color), n(op.lineType), n(op.status),
          n(op.desc), n(op.descJa), op.operatorSlug, ...u.params,
        ),
      ];
    }

    case "station": {
      const u = sets(
        [
          ["name_japanese", op.nameJa],
          ["description", op.desc],
          ["description_japanese", op.descJa],
          ["about", op.about],
          ["about_japanese", op.aboutJa],
          ["location_url", op.locationUrl],
          ["is_verified", op.isVerified, true],
          ["verified_at", op.verifiedAt],
        ],
        11,
      );
      return [
        p(
          `INSERT INTO stations
             (slug, name, name_japanese, description, description_japanese, about,
              about_japanese, location_url, is_verified, verified_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, COALESCE(?9, 0), ?10)
           ON CONFLICT(slug) DO UPDATE SET name = excluded.name${u.sql}, updated_at = CURRENT_TIMESTAMP`,
          op.slug, op.name, n(op.nameJa), n(op.desc), n(op.descJa), n(op.about), n(op.aboutJa),
          n(op.locationUrl), n(op.isVerified), n(op.verifiedAt), ...u.params,
        ),
      ];
    }

    case "facility": {
      const u = sets([["name_japanese", op.nameJa], ["sort_order", op.sortOrder, true]], 5);
      return [
        p(
          `INSERT INTO facilities (slug, name, name_japanese, sort_order)
           VALUES (?1, ?2, ?3, COALESCE(?4, 0))
           ON CONFLICT(slug) DO UPDATE SET name = excluded.name${u.sql}`,
          op.slug, op.name, n(op.nameJa), n(op.sortOrder), ...u.params,
        ),
      ];
    }

    case "topPick": {
      const u = sets(
        [
          ["name_japanese", op.nameJa],
          ["category", op.category, true],
          ["description", op.desc],
          ["description_japanese", op.descJa],
          ["entry_fee", op.entryFee],
          ["entry_fee_japanese", op.entryFeeJa],
          ["notes", op.notes],
          ["notes_japanese", op.notesJa],
          ["map_url", op.mapUrl],
        ],
        12,
      );
      return [
        p(
          `INSERT INTO top_picks
             (slug, name, name_japanese, category, description, description_japanese,
              entry_fee, entry_fee_japanese, notes, notes_japanese, map_url)
           VALUES (?1, ?2, ?3, COALESCE(?4, 'landmark'), ?5, ?6, ?7, ?8, ?9, ?10, ?11)
           ON CONFLICT(slug) DO UPDATE SET name = excluded.name${u.sql}`,
          op.slug, op.name, n(op.nameJa), n(op.category), n(op.desc), n(op.descJa), n(op.entryFee),
          n(op.entryFeeJa), n(op.notes), n(op.notesJa), n(op.mapUrl), ...u.params,
        ),
      ];
    }

    case "lineStation": {
      const u = sets([["station_code", op.code]], 5);
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
             station_order = excluded.station_order${u.sql}`,
          op.lineSlug, op.stationSlug, op.order, n(op.code), ...u.params,
        ),
      ];
    }

    case "floor": {
      const u = sets([["name_japanese", op.nameJa], ["floor_order", op.floorOrder, true]], 5);
      return [
        p(
          `INSERT INTO station_floors (station_id, name, name_japanese, floor_order)
           SELECT s.id, ?2, ?3, COALESCE(?4, 0) FROM stations s WHERE s.slug = ?1
           ON CONFLICT(station_id, name) DO UPDATE SET updated_at = CURRENT_TIMESTAMP${u.sql}`,
          op.stationSlug, op.name, n(op.nameJa), n(op.floorOrder), ...u.params,
        ),
      ];
    }

    case "floorFacility": {
      const u = sets(
        [
          ["facility_count", op.count],
          ["note", op.note],
          ["note_japanese", op.noteJa],
          ["location_type", op.locationType, true],
          ["sort_order", op.sortOrder, true],
        ],
        9,
      );
      return [
        p(
          `INSERT INTO station_floor_facilities
             (floor_id, facility_id, facility_count, note, note_japanese, location_type, sort_order)
           SELECT fl.id, fa.id, ?4, ?5, ?6, COALESCE(?7, 'inside'), COALESCE(?8, 0)
           FROM station_floors fl
           JOIN stations s ON s.id = fl.station_id
           JOIN facilities fa ON fa.slug = ?3
           WHERE s.slug = ?1 AND fl.name = ?2
           ON CONFLICT(floor_id, facility_id) DO UPDATE SET facility_id = excluded.facility_id${u.sql}`,
          op.stationSlug, op.floorName, op.facilitySlug, n(op.count), n(op.note), n(op.noteJa),
          n(op.locationType), n(op.sortOrder), ...u.params,
        ),
      ];
    }

    case "exit": {
      const u = sets(
        [
          ["name_japanese", op.nameJa],
          ["code", op.code],
          ["color_code", op.colorCode],
          ["description", op.desc],
          ["description_japanese", op.descJa],
          ["sort_order", op.sortOrder, true],
        ],
        4,
      );
      return [
        p(
          `UPDATE station_exits SET
             floor_id = (SELECT f.id FROM station_floors f WHERE f.station_id = station_exits.station_id AND f.name = ?3)${u.sql},
             updated_at = CURRENT_TIMESTAMP
           WHERE station_id = (SELECT id FROM stations WHERE slug = ?1) AND name = ?2`,
          op.stationSlug, op.name, op.floorName, ...u.params,
        ),
        p(
          `INSERT INTO station_exits
             (station_id, floor_id, name, name_japanese, code, color_code, description, description_japanese, sort_order)
           SELECT s.id, f.id, ?2, ?4, ?5, ?6, ?7, ?8, COALESCE(?9, 0)
           FROM stations s JOIN station_floors f ON f.station_id = s.id AND f.name = ?3
           WHERE s.slug = ?1
             AND NOT EXISTS (SELECT 1 FROM station_exits e WHERE e.station_id = s.id AND e.name = ?2)`,
          op.stationSlug, op.name, op.floorName, n(op.nameJa), n(op.code), n(op.colorCode), n(op.desc),
          n(op.descJa), n(op.sortOrder),
        ),
      ];
    }

    case "platform": {
      const u = sets(
        [
          ["destinations", op.dest],
          ["destinations_japanese", op.destJa],
          ["notes", op.notes],
          ["notes_japanese", op.notesJa],
          ["sort_order", op.sortOrder, true],
        ],
        5,
      );
      const floorSet =
        op.floorName === undefined
          ? ""
          : `floor_id = (SELECT f.id FROM station_floors f WHERE f.station_id = station_platforms.station_id AND f.name = ?3),`;
      return [
        p(
          `UPDATE station_platforms SET
             ${floorSet}
             updated_at = CURRENT_TIMESTAMP${u.sql}
           WHERE station_id = (SELECT id FROM stations WHERE slug = ?1)
             AND platform_number = ?4
             AND line_id IS (SELECT id FROM lines WHERE slug = ?2)`,
          op.stationSlug, op.lineSlug, n(op.floorName), op.number, ...u.params,
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
          op.stationSlug, op.lineSlug, n(op.floorName), n(op.dest), n(op.destJa), n(op.notes),
          n(op.notesJa), n(op.sortOrder), op.number,
        ),
      ];
    }

    case "stationTopPick": {
      const u = sets(
        [
          ["walking_minutes", op.minutes],
          ["location_type", op.locationType, true],
          ["sort_order", op.sortOrder, true],
        ],
        6,
      );
      return [
        p(
          `INSERT INTO station_top_picks
             (station_id, top_pick_id, walking_minutes, location_type, sort_order)
           SELECT s.id, t.id, ?3, COALESCE(?4, 'outside'), COALESCE(?5, 0)
           FROM stations s, top_picks t WHERE s.slug = ?1 AND t.slug = ?2
           ON CONFLICT(station_id, top_pick_id) DO UPDATE SET top_pick_id = excluded.top_pick_id${u.sql}`,
          op.stationSlug, op.topPickSlug, n(op.minutes), n(op.locationType), n(op.sortOrder), ...u.params,
        ),
      ];
    }
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
