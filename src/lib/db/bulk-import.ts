import type { DeleteOp, ImportOp, ImportSnapshot, OpType, StoredRow, UpsertOp } from "../import/types";

/** Reads the keys of everything an upload can refer to. */
export async function loadImportSnapshot(db: D1Database): Promise<ImportSnapshot> {
  const all = async <T>(sql: string) =>
    (await db.prepare(sql).all<T>()).results ?? [];

  const [operators, lines, stations, facilities, topPicks, floors, exits, platforms, sides, exitPlaces, routes, tips, floorFacilities, stationTopPicks, lineStations, seasons, faqs, dayTrips, transport, hotels, restaurants, stationHotels, stationRestaurants] =
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
        `SELECT s.slug || '|' || sd.name AS k
         FROM station_sides sd JOIN stations s ON s.id = sd.station_id`,
      ),
      all<{ k: string }>(
        `SELECT s.slug || '|' || p.name AS k
         FROM station_exit_places p JOIN stations s ON s.id = p.station_id`,
      ),
      all<{ k: string }>(
        `SELECT s.slug || '|' || r.from_place || '|' || COALESCE(r.route, '') AS k
         FROM station_routes r JOIN stations s ON s.id = r.station_id`,
      ),
      all<{ k: string }>(
        `SELECT s.slug || '|' || t.section || '|' || t.tip AS k
         FROM station_tips t JOIN stations s ON s.id = t.station_id`,
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
      all<{ k: string }>(
        `SELECT s.slug || '|' || x.season AS k
         FROM station_seasons x JOIN stations s ON s.id = x.station_id`,
      ),
      all<{ k: string }>(
        `SELECT s.slug || '|' || x.question AS k
         FROM station_faqs x JOIN stations s ON s.id = x.station_id`,
      ),
      all<{ k: string }>(
        `SELECT s.slug || '|' || x.name AS k
         FROM station_day_trips x JOIN stations s ON s.id = x.station_id`,
      ),
      all<{ k: string }>(
        `SELECT s.slug || '|' || x.place AS k
         FROM station_transport x JOIN stations s ON s.id = x.station_id`,
      ),
      all<{ slug: string }>("SELECT slug FROM hotels"),
      all<{ slug: string }>("SELECT slug FROM restaurants"),
      all<{ k: string }>(
        `SELECT s.slug || '|' || h.slug AS k
         FROM station_hotels x JOIN stations s ON s.id = x.station_id JOIN hotels h ON h.id = x.hotel_id`,
      ),
      all<{ k: string }>(
        `SELECT s.slug || '|' || r.slug AS k
         FROM station_restaurants x JOIN stations s ON s.id = x.station_id JOIN restaurants r ON r.id = x.restaurant_id`,
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
    sides: sides.map((r) => r.k),
    exitPlaces: exitPlaces.map((r) => r.k),
    routes: routes.map((r) => r.k),
    tips: tips.map((r) => r.k),
    seasons: seasons.map((r) => r.k),
    faqs: faqs.map((r) => r.k),
    dayTrips: dayTrips.map((r) => r.k),
    transport: transport.map((r) => r.k),
    hotels,
    restaurants,
    stationHotels: stationHotels.map((r) => r.k),
    stationRestaurants: stationRestaurants.map((r) => r.k),
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

  const [operator, line, station, lineStation, facility, floor, floorFacility, exit, platform, side, exitPlace, route, tip, topPick, stationTopPick, season, faq, dayTrip, transport, hotel, restaurant, stationHotel, stationRestaurant] =
    await Promise.all([
      keyed(`SELECT slug AS k, name, name_japanese AS nameJa, description AS "desc",
                    description_japanese AS descJa, website_url AS url FROM operators`),
      keyed(`SELECT l.slug AS k, o.slug AS operatorSlug, l.name, l.name_japanese AS nameJa, l.code,
                    l.color, l.line_type AS lineType, l.website_status AS status,
                    l.description AS "desc", l.description_japanese AS descJa
             FROM lines l JOIN operators o ON o.id = l.operator_id`),
      keyed(`SELECT slug AS k, name, name_japanese AS nameJa, description AS "desc",
                    description_japanese AS descJa, about, about_japanese AS aboutJa,
                    location_url AS locationUrl, is_verified AS isVerified, verified_at AS verifiedAt,
                    region, region_japanese AS regionJa, sides_note AS sidesNote, sides_note_japanese AS sidesNoteJa, routes_note AS routesNote, routes_note_japanese AS routesNoteJa, exits_note AS exitsNote, exits_note_japanese AS exitsNoteJa, restaurants_note AS restaurantsNote, restaurants_note_japanese AS restaurantsNoteJa, address, address_japanese AS addressJa,
                    stat_lines_note AS statLinesNote, stat_lines_note_japanese AS statLinesNoteJa,
                    stat_riders_value AS statRidersValue, stat_riders_note AS statRidersNote,
                    stat_riders_note_japanese AS statRidersNoteJa,
                    stat_opened_value AS statOpenedValue, stat_opened_note AS statOpenedNote,
                    stat_opened_note_japanese AS statOpenedNoteJa
             FROM stations`),
      keyed(`SELECT l.slug || '|' || s.slug AS k, ls.station_order AS "order", ls.station_code AS code
             FROM line_stations ls JOIN lines l ON l.id = ls.line_id JOIN stations s ON s.id = ls.station_id`),
      keyed(`SELECT slug AS k, name, name_japanese AS nameJa, sort_order AS sortOrder, category FROM facilities`),
      keyed(`SELECT s.slug || '|' || f.name AS k, f.name_japanese AS nameJa, f.floor_order AS floorOrder
             FROM station_floors f JOIN stations s ON s.id = f.station_id`),
      keyed(`SELECT s.slug || '|' || f.name || '|' || fa.slug AS k, sff.facility_count AS count,
                    sff.note, sff.note_japanese AS noteJa, sff.description AS "desc", sff.description_japanese AS descJa, sff.photo_caption AS photoCaption,
                    sff.photo_caption_japanese AS photoCaptionJa, sff.location_type AS locationType,
                    sff.sort_order AS sortOrder,
                    (SELECT group_concat(name, '|') FROM (
                       SELECT e.name AS name
                       FROM station_floor_facility_exits x
                       JOIN station_exits e ON e.id = x.station_exit_id
                       WHERE x.station_floor_facility_id = sff.id
                       ORDER BY e.name)) AS exits
             FROM station_floor_facilities sff
             JOIN station_floors f ON f.id = sff.floor_id
             JOIN stations s ON s.id = f.station_id
             JOIN facilities fa ON fa.id = sff.facility_id`),
      keyed(`SELECT s.slug || '|' || e.name AS k, f.name AS floorName, e.name_japanese AS nameJa,
                    e.code, e.color_code AS colorCode, e.description AS "desc",
                    e.description_japanese AS descJa, e.photo_caption AS photoCaption,
                    e.photo_caption_japanese AS photoCaptionJa, e.sort_order AS sortOrder
             FROM station_exits e JOIN stations s ON s.id = e.station_id
             LEFT JOIN station_floors f ON f.id = e.floor_id`),
      keyed(`SELECT s.slug || '|' || p.platform_number || '|' || COALESCE(l.slug, '') AS k,
                    f.name AS floorName, p.destinations AS dest, p.destinations_japanese AS destJa,
                    p.notes, p.notes_japanese AS notesJa, p.sort_order AS sortOrder,
                    p.platform_group AS "group", p.platform_group_japanese AS groupJa
             FROM station_platforms p JOIN stations s ON s.id = p.station_id
             LEFT JOIN lines l ON l.id = p.line_id
             LEFT JOIN station_floors f ON f.id = p.floor_id`),
      keyed(`SELECT s.slug || '|' || sd.name AS k, sd.name_japanese AS nameJa, sd.subtitle,
                    sd.subtitle_japanese AS subtitleJa, sd.description AS "desc",
                    sd.description_japanese AS descJa, sd.sort_order AS sortOrder,
                    (SELECT group_concat(name, '|') FROM (
                       SELECT e.name AS name
                       FROM station_side_exits x JOIN station_exits e ON e.id = x.exit_id
                       WHERE x.side_id = sd.id
                       ORDER BY e.name)) AS exits
             FROM station_sides sd JOIN stations s ON s.id = sd.station_id`),
      keyed(`SELECT s.slug || '|' || p.name AS k, p.name_japanese AS nameJa, p.category,
                    p.sort_order AS sortOrder,
                    (SELECT group_concat(item, '|') FROM (
                       SELECT e.name || '=' || COALESCE(x.note, '') || '=' || COALESCE(x.note_japanese, '') AS item
                       FROM station_exit_place_exits x JOIN station_exits e ON e.id = x.exit_id
                       WHERE x.place_id = p.id
                       ORDER BY e.name)) AS exits
             FROM station_exit_places p JOIN stations s ON s.id = p.station_id`),
      keyed(`SELECT s.slug || '|' || r.from_place || '|' || COALESCE(r.route, '') AS k,
                    r.from_place_japanese AS fromPlaceJa, r.route_japanese AS routeJa,
                    r.travel_time AS time, r.travel_time_japanese AS timeJa,
                    r.cost, r.cost_japanese AS costJa, r.sort_order AS sortOrder
             FROM station_routes r JOIN stations s ON s.id = r.station_id`),
      keyed(`SELECT s.slug || '|' || t.section || '|' || t.tip AS k, t.tip_japanese AS tipJa, t.sort_order AS sortOrder
             FROM station_tips t JOIN stations s ON s.id = t.station_id`),
      keyed(`SELECT slug AS k, name, name_japanese AS nameJa, kind, kind_japanese AS kindJa, category, description AS "desc",
                    description_japanese AS descJa, entry_fee AS entryFee,
                    entry_fee_japanese AS entryFeeJa, notes, notes_japanese AS notesJa,
                    map_url AS mapUrl FROM top_picks`),
      keyed(`SELECT s.slug || '|' || t.slug AS k, e.name AS exitName, stp.walking_minutes AS minutes,
                    stp.location_type AS locationType, stp.location, stp.location_japanese AS locationJa, stp.sort_order AS sortOrder
             FROM station_top_picks stp JOIN stations s ON s.id = stp.station_id
             JOIN top_picks t ON t.id = stp.top_pick_id LEFT JOIN station_exits e ON e.id = stp.exit_id`),
      keyed(`SELECT s.slug || '|' || x.season AS k, x.months, x.months_japanese AS monthsJa,
                    x.description AS "desc", x.description_japanese AS descJa
             FROM station_seasons x JOIN stations s ON s.id = x.station_id`),
      keyed(`SELECT s.slug || '|' || x.question AS k, x.question_japanese AS questionJa,
                    x.answer, x.answer_japanese AS answerJa, x.sort_order AS sortOrder
             FROM station_faqs x JOIN stations s ON s.id = x.station_id`),
      keyed(`SELECT s.slug || '|' || x.name AS k, x.name_japanese AS nameJa, x.travel_time AS time,
                    x.travel_time_japanese AS timeJa, x.transport, x.transport_japanese AS transportJa,
                    x.description AS "desc", x.description_japanese AS descJa, x.map_url AS mapUrl,
                    x.sort_order AS sortOrder
             FROM station_day_trips x JOIN stations s ON s.id = x.station_id`),
      keyed(`SELECT s.slug || '|' || x.place AS k, x.place_japanese AS placeJa, x.service,
                    x.service_japanese AS serviceJa, x.notes, x.notes_japanese AS notesJa,
                    x.photo_title AS photoTitle, x.photo_title_japanese AS photoTitleJa,
                    x.photo_caption AS photoCaption, x.photo_caption_japanese AS photoCaptionJa,
                    x.sort_order AS sortOrder
             FROM station_transport x JOIN stations s ON s.id = x.station_id`),
      keyed(`SELECT slug AS k, name, name_japanese AS nameJa, kind, kind_japanese AS kindJa,
                    description AS "desc", description_japanese AS descJa, map_url AS mapUrl,
                    booking_url AS bookingUrl FROM hotels`),
      keyed(`SELECT slug AS k, name, name_japanese AS nameJa, kind, kind_japanese AS kindJa,
                    description AS "desc", description_japanese AS descJa, map_url AS mapUrl FROM restaurants`),
      keyed(`SELECT s.slug || '|' || h.slug AS k, e.name AS exitName, x.walking_minutes AS minutes, x.location, x.location_japanese AS locationJa, x.sort_order AS sortOrder
             FROM station_hotels x JOIN stations s ON s.id = x.station_id JOIN hotels h ON h.id = x.hotel_id LEFT JOIN station_exits e ON e.id = x.exit_id`),
      keyed(`SELECT s.slug || '|' || r.slug AS k, e.name AS exitName, x.walking_minutes AS minutes, x.location, x.location_japanese AS locationJa, x.sort_order AS sortOrder
             FROM station_restaurants x JOIN stations s ON s.id = x.station_id JOIN restaurants r ON r.id = x.restaurant_id LEFT JOIN station_exits e ON e.id = x.exit_id`),
    ]);

  return { operator, line, station, lineStation, facility, floor, floorFacility, exit, platform, side, exitPlace, route, tip, topPick, stationTopPick, season, faq, dayTrip, transport, hotel, restaurant, stationHotel, stationRestaurant };
}

/** Order in which operation types are applied (a type only needs the ones before it). */
const TYPE_ORDER: OpType[] = [
  "operator",
  "line",
  "station",
  "facility",
  "topPick",
  "lineStation",
  "floor",
  "exit",
  "floorFacility",
  "platform",
  "side",
  "exitPlace",
  "route",
  "tip",
  "season",
  "faq",
  "dayTrip",
  "transport",
  "hotel",
  "restaurant",
  "stationHotel",
  "stationRestaurant",
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

function statementsFor(db: D1Database, op: UpsertOp): D1PreparedStatement[] {
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
          ["region", op.region],
          ["region_japanese", op.regionJa],
          ["sides_note", op.sidesNote],
          ["sides_note_japanese", op.sidesNoteJa],
          ["routes_note", op.routesNote],
          ["routes_note_japanese", op.routesNoteJa],
          ["exits_note", op.exitsNote],
          ["exits_note_japanese", op.exitsNoteJa],
          ["restaurants_note", op.restaurantsNote],
          ["restaurants_note_japanese", op.restaurantsNoteJa],
          ["address", op.address],
          ["address_japanese", op.addressJa],
          ["stat_lines_note", op.statLinesNote],
          ["stat_lines_note_japanese", op.statLinesNoteJa],
          ["stat_riders_value", op.statRidersValue],
          ["stat_riders_note", op.statRidersNote],
          ["stat_riders_note_japanese", op.statRidersNoteJa],
          ["stat_opened_value", op.statOpenedValue],
          ["stat_opened_note", op.statOpenedNote],
          ["stat_opened_note_japanese", op.statOpenedNoteJa],
        ],
        31,
      );
      return [
        p(
          `INSERT INTO stations
             (slug, name, name_japanese, description, description_japanese, about,
              about_japanese, location_url, is_verified, verified_at,
              region, region_japanese, stat_lines_note, stat_lines_note_japanese,
              stat_riders_value, stat_riders_note, stat_riders_note_japanese,
              stat_opened_value, stat_opened_note, stat_opened_note_japanese,
              address, address_japanese, sides_note, sides_note_japanese,
              routes_note, routes_note_japanese, exits_note, exits_note_japanese,
              restaurants_note, restaurants_note_japanese)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, COALESCE(?9, 0), ?10,
                   ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24, ?25, ?26, ?27, ?28, ?29, ?30)
           ON CONFLICT(slug) DO UPDATE SET name = excluded.name${u.sql}, updated_at = CURRENT_TIMESTAMP`,
          op.slug, op.name, n(op.nameJa), n(op.desc), n(op.descJa), n(op.about), n(op.aboutJa),
          n(op.locationUrl), n(op.isVerified), n(op.verifiedAt),
          n(op.region), n(op.regionJa), n(op.statLinesNote), n(op.statLinesNoteJa),
          n(op.statRidersValue), n(op.statRidersNote), n(op.statRidersNoteJa),
          n(op.statOpenedValue), n(op.statOpenedNote), n(op.statOpenedNoteJa), n(op.address), n(op.addressJa), n(op.sidesNote), n(op.sidesNoteJa), n(op.routesNote), n(op.routesNoteJa), n(op.exitsNote), n(op.exitsNoteJa), n(op.restaurantsNote), n(op.restaurantsNoteJa), ...u.params,
        ),
      ];
    }

    case "facility": {
      const u = sets(
        [["name_japanese", op.nameJa], ["sort_order", op.sortOrder, true], ["category", op.category, true]],
        6,
      );
      return [
        p(
          `INSERT INTO facilities (slug, name, name_japanese, sort_order, category)
           VALUES (?1, ?2, ?3, COALESCE(?4, 0), COALESCE(?5, 'other'))
           ON CONFLICT(slug) DO UPDATE SET name = excluded.name${u.sql}`,
          op.slug, op.name, n(op.nameJa), n(op.sortOrder), n(op.category), ...u.params,
        ),
      ];
    }

    case "topPick": {
      const u = sets(
        [
          ["name_japanese", op.nameJa],
          ["kind", op.kind],
          ["kind_japanese", op.kindJa],
          ["category", op.category, true],
          ["description", op.desc],
          ["description_japanese", op.descJa],
          ["entry_fee", op.entryFee],
          ["entry_fee_japanese", op.entryFeeJa],
          ["notes", op.notes],
          ["notes_japanese", op.notesJa],
          ["map_url", op.mapUrl],
        ],
        14,
      );
      return [
        p(
          `INSERT INTO top_picks
             (slug, name, name_japanese, category, description, description_japanese,
              entry_fee, entry_fee_japanese, notes, notes_japanese, map_url, kind, kind_japanese)
           VALUES (?1, ?2, ?3, COALESCE(?4, 'landmark'), ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
           ON CONFLICT(slug) DO UPDATE SET name = excluded.name${u.sql}`,
          op.slug, op.name, n(op.nameJa), n(op.category), n(op.desc), n(op.descJa), n(op.entryFee),
          n(op.entryFeeJa), n(op.notes), n(op.notesJa), n(op.mapUrl), n(op.kind), n(op.kindJa), ...u.params,
        ),
      ];
    }

    case "lineStation": {
      const u = sets([["station_code", op.code]], 5);
      return [
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
          ["description", op.desc],
          ["description_japanese", op.descJa],
          ["photo_caption", op.photoCaption],
          ["photo_caption_japanese", op.photoCaptionJa],
          ["location_type", op.locationType, true],
          ["sort_order", op.sortOrder, true],
        ],
        13,
      );

      const statements = [
        p(
          `INSERT INTO station_floor_facilities
             (floor_id, facility_id, facility_count, note, note_japanese, description, description_japanese, photo_caption, photo_caption_japanese, location_type, sort_order)
           SELECT fl.id, fa.id, ?4, ?5, ?6, ?11, ?12, ?7, ?8, COALESCE(?9, 'inside'), COALESCE(?10, 0)
           FROM station_floors fl
           JOIN stations s ON s.id = fl.station_id
           JOIN facilities fa ON fa.slug = ?3
           WHERE s.slug = ?1 AND fl.name = ?2
           ON CONFLICT(floor_id, facility_id) DO UPDATE SET facility_id = excluded.facility_id${u.sql}`,
          op.stationSlug, op.floorName, op.facilitySlug, n(op.count), n(op.note), n(op.noteJa),
          n(op.photoCaption), n(op.photoCaptionJa), n(op.locationType), n(op.sortOrder), n(op.desc), n(op.descJa), ...u.params,
        ),
      ];

      // Nearby exits: the column is in the file = the list is replaced by it
      // (an empty cell clears it); no column = leave the exits alone.
      if (op.exits !== undefined) {
        const entry = `(SELECT sff.id FROM station_floor_facilities sff
                         JOIN station_floors f ON f.id = sff.floor_id
                         JOIN stations s ON s.id = f.station_id
                         JOIN facilities fa ON fa.id = sff.facility_id
                         WHERE s.slug = ?1 AND f.name = ?2 AND fa.slug = ?3)`;

        statements.push(
          p(
            `DELETE FROM station_floor_facility_exits WHERE station_floor_facility_id = ${entry}`,
            op.stationSlug, op.floorName, op.facilitySlug,
          ),
        );

        for (const exitName of (op.exits ?? "").split("|").filter(Boolean)) {
          statements.push(
            p(
              `INSERT OR IGNORE INTO station_floor_facility_exits (station_floor_facility_id, station_exit_id)
               SELECT ${entry}, e.id
               FROM station_exits e
               WHERE e.station_id = (SELECT id FROM stations WHERE slug = ?1) AND e.name = ?4`,
              op.stationSlug, op.floorName, op.facilitySlug, exitName,
            ),
          );
        }
      }

      return statements;
    }

    case "exit": {
      const u = sets(
        [
          ["name_japanese", op.nameJa],
          ["code", op.code],
          ["color_code", op.colorCode],
          ["description", op.desc],
          ["description_japanese", op.descJa],
          ["photo_caption", op.photoCaption],
          ["photo_caption_japanese", op.photoCaptionJa],
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
             (station_id, floor_id, name, name_japanese, code, color_code, description, description_japanese, sort_order,
              photo_caption, photo_caption_japanese)
           SELECT s.id, f.id, ?2, ?4, ?5, ?6, ?7, ?8, COALESCE(?9, 0), ?10, ?11
           FROM stations s JOIN station_floors f ON f.station_id = s.id AND f.name = ?3
           WHERE s.slug = ?1
             AND NOT EXISTS (SELECT 1 FROM station_exits e WHERE e.station_id = s.id AND e.name = ?2)`,
          op.stationSlug, op.name, op.floorName, n(op.nameJa), n(op.code), n(op.colorCode), n(op.desc),
          n(op.descJa), n(op.sortOrder), n(op.photoCaption), n(op.photoCaptionJa),
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
          ["platform_group", op.group],
          ["platform_group_japanese", op.groupJa],
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
              destinations_japanese, notes, notes_japanese, sort_order,
              platform_group, platform_group_japanese)
           SELECT s.id,
                  (SELECT id FROM lines WHERE slug = ?2),
                  (SELECT f.id FROM station_floors f WHERE f.station_id = s.id AND f.name = ?3),
                  ?9, ?4, ?5, ?6, ?7, COALESCE(?8, 0), ?10, ?11
           FROM stations s
           WHERE s.slug = ?1
             AND NOT EXISTS (
               SELECT 1 FROM station_platforms x
               WHERE x.station_id = s.id AND x.platform_number = ?9
                 AND x.line_id IS (SELECT id FROM lines WHERE slug = ?2)
             )`,
          op.stationSlug, op.lineSlug, n(op.floorName), n(op.dest), n(op.destJa), n(op.notes),
          n(op.notesJa), n(op.sortOrder), op.number, n(op.group), n(op.groupJa),
        ),
      ];
    }

    case "side": {
      const u = sets(
        [
          ["name_japanese", op.nameJa],
          ["subtitle", op.subtitle],
          ["subtitle_japanese", op.subtitleJa],
          ["description", op.desc],
          ["description_japanese", op.descJa],
          ["sort_order", op.sortOrder, true],
        ],
        3,
      );
      const statements = [
        p(
          `UPDATE station_sides SET updated_at = CURRENT_TIMESTAMP${u.sql}
           WHERE station_id = (SELECT id FROM stations WHERE slug = ?1) AND name = ?2`,
          op.stationSlug, op.name, ...u.params,
        ),
        p(
          `INSERT INTO station_sides
             (station_id, name, name_japanese, subtitle, subtitle_japanese, description,
              description_japanese, sort_order)
           SELECT s.id, ?2, ?3, ?4, ?5, ?6, ?7, COALESCE(?8, 0)
           FROM stations s
           WHERE s.slug = ?1
             AND NOT EXISTS (SELECT 1 FROM station_sides x WHERE x.station_id = s.id AND x.name = ?2)`,
          op.stationSlug, op.name, n(op.nameJa), n(op.subtitle), n(op.subtitleJa), n(op.desc),
          n(op.descJa), n(op.sortOrder),
        ),
      ];

      // Exits of the side: column in the file = the list is replaced (empty cell clears it).
      if (op.exits !== undefined) {
        const sideId = `(SELECT sd.id FROM station_sides sd JOIN stations s ON s.id = sd.station_id
                         WHERE s.slug = ?1 AND sd.name = ?2)`;
        statements.push(p(`DELETE FROM station_side_exits WHERE side_id = ${sideId}`, op.stationSlug, op.name));
        for (const exitName of (op.exits ?? "").split("|").filter(Boolean)) {
          statements.push(
            p(
              `INSERT OR IGNORE INTO station_side_exits (side_id, exit_id)
               SELECT ${sideId}, e.id FROM station_exits e
               WHERE e.station_id = (SELECT id FROM stations WHERE slug = ?1) AND e.name = ?3`,
              op.stationSlug, op.name, exitName,
            ),
          );
        }
      }
      return statements;
    }

    case "exitPlace": {
      const u = sets(
        [
          ["name_japanese", op.nameJa],
          ["category", op.category, true],
          ["sort_order", op.sortOrder, true],
        ],
        3,
      );
      const statements = [
        p(
          `UPDATE station_exit_places SET updated_at = CURRENT_TIMESTAMP${u.sql}
           WHERE station_id = (SELECT id FROM stations WHERE slug = ?1) AND name = ?2`,
          op.stationSlug, op.name, ...u.params,
        ),
        p(
          `INSERT INTO station_exit_places (station_id, name, name_japanese, category, sort_order)
           SELECT s.id, ?2, ?3, COALESCE(?4, 'sights'), COALESCE(?5, 0)
           FROM stations s
           WHERE s.slug = ?1
             AND NOT EXISTS (SELECT 1 FROM station_exit_places x WHERE x.station_id = s.id AND x.name = ?2)`,
          op.stationSlug, op.name, n(op.nameJa), n(op.category), n(op.sortOrder),
        ),
      ];

      if (op.exits !== undefined) {
        const placeId = `(SELECT pl.id FROM station_exit_places pl JOIN stations s ON s.id = pl.station_id
                          WHERE s.slug = ?1 AND pl.name = ?2)`;
        statements.push(p(`DELETE FROM station_exit_place_exits WHERE place_id = ${placeId}`, op.stationSlug, op.name));
        for (const item of (op.exits ?? "").split("|").filter(Boolean)) {
          const [exitName, note = "", noteJa = ""] = item.split("=");
          statements.push(
            p(
              `INSERT OR IGNORE INTO station_exit_place_exits (place_id, exit_id, note, note_japanese)
               SELECT ${placeId}, e.id, NULLIF(?4, ''), NULLIF(?5, '') FROM station_exits e
               WHERE e.station_id = (SELECT id FROM stations WHERE slug = ?1) AND e.name = ?3`,
              op.stationSlug, op.name, exitName, note, noteJa,
            ),
          );
        }
      }
      return statements;
    }

    case "route": {
      const u = sets(
        [
          ["from_place_japanese", op.fromPlaceJa],
          ["route_japanese", op.routeJa],
          ["travel_time", op.time],
          ["travel_time_japanese", op.timeJa],
          ["cost", op.cost],
          ["cost_japanese", op.costJa],
          ["sort_order", op.sortOrder, true],
        ],
        4,
      );
      return [
        p(
          `UPDATE station_routes SET updated_at = CURRENT_TIMESTAMP${u.sql}
           WHERE station_id = (SELECT id FROM stations WHERE slug = ?1)
             AND from_place = ?2 AND COALESCE(route, '') = ?3`,
          op.stationSlug, op.fromPlace, op.route ?? "", ...u.params,
        ),
        p(
          `INSERT INTO station_routes
             (station_id, from_place, from_place_japanese, route, route_japanese, travel_time,
              travel_time_japanese, cost, cost_japanese, sort_order)
           SELECT s.id, ?2, ?4, ?3, ?5, ?6, ?7, ?8, ?9, COALESCE(?10, 0)
           FROM stations s
           WHERE s.slug = ?1
             AND NOT EXISTS (
               SELECT 1 FROM station_routes x
               WHERE x.station_id = s.id AND x.from_place = ?2 AND COALESCE(x.route, '') = ?3)`,
          op.stationSlug, op.fromPlace, op.route ?? "", n(op.fromPlaceJa), n(op.routeJa), n(op.time),
          n(op.timeJa), n(op.cost), n(op.costJa), n(op.sortOrder),
        ),
      ];
    }

    case "tip": {
      const u = sets([["tip_japanese", op.tipJa], ["sort_order", op.sortOrder, true]], 4);
      return [
        p(
          `UPDATE station_tips SET updated_at = CURRENT_TIMESTAMP${u.sql}
           WHERE station_id = (SELECT id FROM stations WHERE slug = ?1) AND section = ?2 AND tip = ?3`,
          op.stationSlug, op.section, op.tip, ...u.params,
        ),
        p(
          `INSERT INTO station_tips (station_id, section, tip, tip_japanese, sort_order)
           SELECT s.id, ?2, ?3, ?4, COALESCE(?5, 0)
           FROM stations s
           WHERE s.slug = ?1
             AND NOT EXISTS (SELECT 1 FROM station_tips x WHERE x.station_id = s.id AND x.section = ?2 AND x.tip = ?3)`,
          op.stationSlug, op.section, op.tip, n(op.tipJa), n(op.sortOrder),
        ),
      ];
    }

    case "hotel": {
      const u = sets(
        [
          ["name_japanese", op.nameJa], ["kind", op.kind], ["kind_japanese", op.kindJa], ["description", op.desc],
          ["description_japanese", op.descJa], ["map_url", op.mapUrl], ["booking_url", op.bookingUrl],
        ],
        10,
      );
      return [
        p(
          `INSERT INTO hotels (slug, name, name_japanese, kind, kind_japanese, description, description_japanese, map_url, booking_url)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
           ON CONFLICT(slug) DO UPDATE SET name = excluded.name${u.sql}, updated_at = CURRENT_TIMESTAMP`,
          op.slug, op.name, n(op.nameJa), n(op.kind), n(op.kindJa), n(op.desc), n(op.descJa), n(op.mapUrl), n(op.bookingUrl), ...u.params,
        ),
      ];
    }

    case "restaurant": {
      const u = sets(
        [
          ["name_japanese", op.nameJa], ["kind", op.kind], ["kind_japanese", op.kindJa], ["description", op.desc],
          ["description_japanese", op.descJa], ["map_url", op.mapUrl],
        ],
        9,
      );
      return [
        p(
          `INSERT INTO restaurants (slug, name, name_japanese, kind, kind_japanese, description, description_japanese, map_url)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
           ON CONFLICT(slug) DO UPDATE SET name = excluded.name${u.sql}, updated_at = CURRENT_TIMESTAMP`,
          op.slug, op.name, n(op.nameJa), n(op.kind), n(op.kindJa), n(op.desc), n(op.descJa), n(op.mapUrl), ...u.params,
        ),
      ];
    }

    case "stationHotel": {
      const u = sets(
        [["walking_minutes", op.minutes], ["location", op.location], ["location_japanese", op.locationJa], ["sort_order", op.sortOrder, true]],
        7,
      );
      const out = [
        p(
          `INSERT INTO station_hotels (station_id, hotel_id, location, location_japanese, sort_order, walking_minutes)
           SELECT s.id, h.id, ?3, ?4, COALESCE(?5, 0), ?6
           FROM stations s, hotels h WHERE s.slug = ?1 AND h.slug = ?2
           ON CONFLICT(station_id, hotel_id) DO UPDATE SET hotel_id = excluded.hotel_id${u.sql}`,
          op.stationSlug, op.hotelSlug, n(op.location), n(op.locationJa), n(op.sortOrder), n(op.minutes), ...u.params,
        ),
      ];
      if (op.exitName !== undefined) {
        out.push(
          p(
            `UPDATE station_hotels SET
               exit_id = (SELECT e.id FROM station_exits e WHERE e.station_id = station_hotels.station_id AND e.name = ?3)
             WHERE station_id = (SELECT id FROM stations WHERE slug = ?1)
               AND hotel_id = (SELECT id FROM hotels WHERE slug = ?2)`,
            op.stationSlug, op.hotelSlug, op.exitName,
          ),
        );
      }
      return out;
    }


    case "stationRestaurant": {
      const u = sets(
        [["walking_minutes", op.minutes], ["location", op.location], ["location_japanese", op.locationJa], ["sort_order", op.sortOrder, true]],
        7,
      );
      const out = [
        p(
          `INSERT INTO station_restaurants (station_id, restaurant_id, location, location_japanese, sort_order, walking_minutes)
           SELECT s.id, r.id, ?3, ?4, COALESCE(?5, 0), ?6
           FROM stations s, restaurants r WHERE s.slug = ?1 AND r.slug = ?2
           ON CONFLICT(station_id, restaurant_id) DO UPDATE SET restaurant_id = excluded.restaurant_id${u.sql}`,
          op.stationSlug, op.restaurantSlug, n(op.location), n(op.locationJa), n(op.sortOrder), n(op.minutes), ...u.params,
        ),
      ];
      if (op.exitName !== undefined) {
        out.push(
          p(
            `UPDATE station_restaurants SET
               exit_id = (SELECT e.id FROM station_exits e WHERE e.station_id = station_restaurants.station_id AND e.name = ?3)
             WHERE station_id = (SELECT id FROM stations WHERE slug = ?1)
               AND restaurant_id = (SELECT id FROM restaurants WHERE slug = ?2)`,
            op.stationSlug, op.restaurantSlug, op.exitName,
          ),
        );
      }
      return out;
    }


    case "transport": {
      const u = sets(
        [
          ["place_japanese", op.placeJa], ["service", op.service], ["service_japanese", op.serviceJa],
          ["notes", op.notes], ["notes_japanese", op.notesJa], ["photo_title", op.photoTitle],
          ["photo_title_japanese", op.photoTitleJa], ["photo_caption", op.photoCaption],
          ["photo_caption_japanese", op.photoCaptionJa], ["sort_order", op.sortOrder, true],
        ],
        3,
      );
      return [
        p(
          `UPDATE station_transport SET updated_at = CURRENT_TIMESTAMP${u.sql}
           WHERE station_id = (SELECT id FROM stations WHERE slug = ?1) AND place = ?2`,
          op.stationSlug, op.place, ...u.params,
        ),
        p(
          `INSERT INTO station_transport
             (station_id, place, place_japanese, service, service_japanese, notes, notes_japanese,
              photo_title, photo_title_japanese, photo_caption, photo_caption_japanese, sort_order)
           SELECT s.id, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, COALESCE(?12, 0)
           FROM stations s
           WHERE s.slug = ?1
             AND NOT EXISTS (SELECT 1 FROM station_transport x WHERE x.station_id = s.id AND x.place = ?2)`,
          op.stationSlug, op.place, n(op.placeJa), n(op.service), n(op.serviceJa), n(op.notes), n(op.notesJa),
          n(op.photoTitle), n(op.photoTitleJa), n(op.photoCaption), n(op.photoCaptionJa), n(op.sortOrder),
        ),
      ];
    }

    case "dayTrip": {
      const u = sets(
        [
          ["name_japanese", op.nameJa], ["travel_time", op.time], ["travel_time_japanese", op.timeJa],
          ["transport", op.transport], ["transport_japanese", op.transportJa], ["description", op.desc],
          ["description_japanese", op.descJa], ["map_url", op.mapUrl], ["sort_order", op.sortOrder, true],
        ],
        3,
      );
      return [
        p(
          `UPDATE station_day_trips SET updated_at = CURRENT_TIMESTAMP${u.sql}
           WHERE station_id = (SELECT id FROM stations WHERE slug = ?1) AND name = ?2`,
          op.stationSlug, op.name, ...u.params,
        ),
        p(
          `INSERT INTO station_day_trips
             (station_id, name, name_japanese, travel_time, travel_time_japanese, transport, transport_japanese,
              description, description_japanese, map_url, sort_order)
           SELECT s.id, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, COALESCE(?11, 0)
           FROM stations s
           WHERE s.slug = ?1
             AND NOT EXISTS (SELECT 1 FROM station_day_trips x WHERE x.station_id = s.id AND x.name = ?2)`,
          op.stationSlug, op.name, n(op.nameJa), n(op.time), n(op.timeJa), n(op.transport), n(op.transportJa),
          n(op.desc), n(op.descJa), n(op.mapUrl), n(op.sortOrder),
        ),
      ];
    }

    case "faq": {
      const u = sets(
        [["question_japanese", op.questionJa], ["answer", op.answer, true], ["answer_japanese", op.answerJa], ["sort_order", op.sortOrder, true]],
        3,
      );
      return [
        p(
          `UPDATE station_faqs SET updated_at = CURRENT_TIMESTAMP${u.sql}
           WHERE station_id = (SELECT id FROM stations WHERE slug = ?1) AND question = ?2`,
          op.stationSlug, op.question, ...u.params,
        ),
        p(
          `INSERT INTO station_faqs (station_id, question, question_japanese, answer, answer_japanese, sort_order)
           SELECT s.id, ?2, ?3, COALESCE(?4, ''), ?5, COALESCE(?6, 0)
           FROM stations s
           WHERE s.slug = ?1
             AND NOT EXISTS (SELECT 1 FROM station_faqs x WHERE x.station_id = s.id AND x.question = ?2)`,
          op.stationSlug, op.question, n(op.questionJa), n(op.answer), n(op.answerJa), n(op.sortOrder),
        ),
      ];
    }

    case "season": {
      const u = sets(
        [["months", op.months], ["months_japanese", op.monthsJa], ["description", op.desc], ["description_japanese", op.descJa]],
        3,
      );
      return [
        p(
          `UPDATE station_seasons SET updated_at = CURRENT_TIMESTAMP${u.sql}
           WHERE station_id = (SELECT id FROM stations WHERE slug = ?1) AND season = ?2`,
          op.stationSlug, op.season, ...u.params,
        ),
        p(
          `INSERT INTO station_seasons (station_id, season, months, months_japanese, description, description_japanese)
           SELECT s.id, ?2, ?3, ?4, ?5, ?6
           FROM stations s
           WHERE s.slug = ?1
             AND NOT EXISTS (SELECT 1 FROM station_seasons x WHERE x.station_id = s.id AND x.season = ?2)`,
          op.stationSlug, op.season, n(op.months), n(op.monthsJa), n(op.desc), n(op.descJa),
        ),
      ];
    }

    case "stationTopPick": {
      const u = sets(
        [
          ["walking_minutes", op.minutes],
          ["location_type", op.locationType, true],
          ["location", op.location],
          ["location_japanese", op.locationJa],
          ["sort_order", op.sortOrder, true],
        ],
        8,
      );
      const out = [
        p(
          `INSERT INTO station_top_picks
             (station_id, top_pick_id, walking_minutes, location_type, sort_order, location, location_japanese)
           SELECT s.id, t.id, ?3, COALESCE(?4, 'outside'), COALESCE(?5, 0), ?6, ?7
           FROM stations s, top_picks t WHERE s.slug = ?1 AND t.slug = ?2
           ON CONFLICT(station_id, top_pick_id) DO UPDATE SET top_pick_id = excluded.top_pick_id${u.sql}`,
          op.stationSlug, op.topPickSlug, n(op.minutes), n(op.locationType), n(op.sortOrder), n(op.location), n(op.locationJa), ...u.params,
        ),
      ];
      if (op.exitName !== undefined) {
        out.push(
          p(
            `UPDATE station_top_picks SET
               exit_id = (SELECT e.id FROM station_exits e WHERE e.station_id = station_top_picks.station_id AND e.name = ?3),
               floor_id = COALESCE((SELECT e.floor_id FROM station_exits e WHERE e.station_id = station_top_picks.station_id AND e.name = ?3), floor_id)
             WHERE station_id = (SELECT id FROM stations WHERE slug = ?1)
               AND top_pick_id = (SELECT id FROM top_picks WHERE slug = ?2)`,
            op.stationSlug, op.topPickSlug, op.exitName,
          ),
        );
      }
      return out;
    }
  }
}

/** DELETE for one row (children are removed by the foreign keys' ON DELETE rules). */
function deleteStatement(db: D1Database, op: DeleteOp): D1PreparedStatement {
  const k = op.key.split("|");
  const p = (sql: string, ...values: string[]) => db.prepare(sql).bind(...values);

  switch (op.type) {
    case "operator":
      return p("DELETE FROM operators WHERE slug = ?1", k[0]);
    case "line":
      return p("DELETE FROM lines WHERE slug = ?1", k[0]);
    case "station":
      return p("DELETE FROM stations WHERE slug = ?1", k[0]);
    case "facility":
      return p("DELETE FROM facilities WHERE slug = ?1", k[0]);
    case "topPick":
      return p("DELETE FROM top_picks WHERE slug = ?1", k[0]);
    case "lineStation":
      return p(
        `DELETE FROM line_stations
         WHERE line_id = (SELECT id FROM lines WHERE slug = ?1)
           AND station_id = (SELECT id FROM stations WHERE slug = ?2)`,
        k[0], k[1],
      );
    case "floor":
      return p(
        `DELETE FROM station_floors
         WHERE station_id = (SELECT id FROM stations WHERE slug = ?1) AND name = ?2`,
        k[0], k[1],
      );
    case "floorFacility":
      return p(
        `DELETE FROM station_floor_facilities
         WHERE floor_id = (SELECT f.id FROM station_floors f JOIN stations s ON s.id = f.station_id
                           WHERE s.slug = ?1 AND f.name = ?2)
           AND facility_id = (SELECT id FROM facilities WHERE slug = ?3)`,
        k[0], k[1], k[2],
      );
    case "exit":
      return p(
        `DELETE FROM station_exits
         WHERE station_id = (SELECT id FROM stations WHERE slug = ?1) AND name = ?2`,
        k[0], k[1],
      );
    case "platform":
      return p(
        `DELETE FROM station_platforms
         WHERE station_id = (SELECT id FROM stations WHERE slug = ?1)
           AND platform_number = ?2
           AND line_id IS (SELECT id FROM lines WHERE slug = ?3)`,
        k[0], k[1], k[2] ?? "",
      );
    case "side":
      return p(
        `DELETE FROM station_sides
         WHERE station_id = (SELECT id FROM stations WHERE slug = ?1) AND name = ?2`,
        k[0], k[1],
      );
    case "exitPlace":
      return p(
        `DELETE FROM station_exit_places
         WHERE station_id = (SELECT id FROM stations WHERE slug = ?1) AND name = ?2`,
        k[0], k[1],
      );
    case "route":
      return p(
        `DELETE FROM station_routes
         WHERE station_id = (SELECT id FROM stations WHERE slug = ?1)
           AND from_place = ?2 AND COALESCE(route, '') = ?3`,
        k[0], k[1], k[2] ?? "",
      );
    case "tip":
      return p(
        `DELETE FROM station_tips
         WHERE station_id = (SELECT id FROM stations WHERE slug = ?1) AND section = ?2 AND tip = ?3`,
        k[0], k[1], k.slice(2).join("|"),
      );
    case "hotel":
      return p(`DELETE FROM hotels WHERE slug = ?1`, k[0]);
    case "restaurant":
      return p(`DELETE FROM restaurants WHERE slug = ?1`, k[0]);
    case "stationHotel":
      return p(
        `DELETE FROM station_hotels
         WHERE station_id = (SELECT id FROM stations WHERE slug = ?1)
           AND hotel_id = (SELECT id FROM hotels WHERE slug = ?2)`,
        k[0], k[1],
      );
    case "stationRestaurant":
      return p(
        `DELETE FROM station_restaurants
         WHERE station_id = (SELECT id FROM stations WHERE slug = ?1)
           AND restaurant_id = (SELECT id FROM restaurants WHERE slug = ?2)`,
        k[0], k[1],
      );
    case "transport":
      return p(
        `DELETE FROM station_transport
         WHERE station_id = (SELECT id FROM stations WHERE slug = ?1) AND place = ?2`,
        k[0], k.slice(1).join("|"),
      );
    case "dayTrip":
      return p(
        `DELETE FROM station_day_trips
         WHERE station_id = (SELECT id FROM stations WHERE slug = ?1) AND name = ?2`,
        k[0], k.slice(1).join("|"),
      );
    case "faq":
      return p(
        `DELETE FROM station_faqs
         WHERE station_id = (SELECT id FROM stations WHERE slug = ?1) AND question = ?2`,
        k[0], k.slice(1).join("|"),
      );
    case "season":
      return p(
        `DELETE FROM station_seasons
         WHERE station_id = (SELECT id FROM stations WHERE slug = ?1) AND season = ?2`,
        k[0], k[1],
      );
    case "stationTopPick":
      return p(
        `DELETE FROM station_top_picks
         WHERE station_id = (SELECT id FROM stations WHERE slug = ?1)
           AND top_pick_id = (SELECT id FROM top_picks WHERE slug = ?2)`,
        k[0], k[1],
      );
  }
}

/**
 * Applies every operation in one batch: either all of it is saved, or none.
 * Deletes run first (children before parents), then the creates and updates.
 */
export async function applyImportOps(db: D1Database, ops: ImportOp[]): Promise<void> {
  const deletes = ops
    .filter((op): op is DeleteOp => op.t === "delete")
    .sort((a, b) => TYPE_ORDER.indexOf(b.type) - TYPE_ORDER.indexOf(a.type));
  const upserts = ops
    .filter((op): op is UpsertOp => op.t !== "delete")
    .sort((a, b) => TYPE_ORDER.indexOf(a.t) - TYPE_ORDER.indexOf(b.t));

  // Stations may swap or shift places in a line. The "unique order per line"
  // rule must not trip half way, so every row that is about to move is first
  // parked on a negative number; the upserts then put the real numbers back.
  const parking = upserts
    .filter((op): op is Extract<UpsertOp, { t: "lineStation" }> => op.t === "lineStation")
    .map((op) =>
      db
        .prepare(
          `UPDATE line_stations SET station_order = -id
           WHERE line_id = (SELECT id FROM lines WHERE slug = ?1)
             AND station_id = (SELECT id FROM stations WHERE slug = ?2)`,
        )
        .bind(op.lineSlug, op.stationSlug),
    );

  const statements = [
    ...deletes.map((op) => deleteStatement(db, op)),
    ...parking,
    ...upserts.flatMap((op) => statementsFor(db, op)),
  ];

  if (statements.length === 0) return;
  await db.batch(statements);
}
