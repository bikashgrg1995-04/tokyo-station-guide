/** Data for the public station page (/station/<slug>). Starts small: the page grows section by section. */

export interface StationPageLine {
  id: number;
  name: string;
  name_japanese: string | null;
  color: string | null;
  code: string | null;
  station_code: string | null;
  operator_name: string | null;
  operator_name_japanese: string | null;
  prev: StationPageNeighbor | null;
  next: StationPageNeighbor | null;
}

export interface StationPageNeighbor {
  slug: string;
  name: string;
  name_japanese: string | null;
  code: string | null;
  /** Has a public page (/station/<slug>). */
  verified: boolean;
}

export interface StationPageFacility {
  id: number;
  name: string;
  name_japanese: string | null;
  slug: string;
  icon: string | null;
  icon_dark: string | null;
  category: string;
}

export interface StationPagePlatform {
  line_id: number | null;
  platform_number: string;
  destinations: string | null;
  destinations_japanese: string | null;
  line_name: string | null;
  line_name_japanese: string | null;
  line_color: string | null;
  group: string | null;
  group_japanese: string | null;
}

export interface StationPageSide {
  id: number;
  /** Exits listed under this side in "Which exit?" (station_side_exits). */
  exit_ids: number[];
  name: string;
  name_japanese: string | null;
  subtitle: string | null;
  subtitle_japanese: string | null;
  description: string | null;
  description_japanese: string | null;
}

export interface StationPageRoute {
  from_place: string;
  from_place_japanese: string | null;
  route: string | null;
  route_japanese: string | null;
  travel_time: string | null;
  travel_time_japanese: string | null;
  cost: string | null;
  cost_japanese: string | null;
}

export interface StationPageExit {
  id: number;
  color_code: string | null;
  code: string | null;
  name: string;
  name_japanese: string | null;
  description: string | null;
  description_japanese: string | null;
  photo: string | null;
  photo_caption: string | null;
  photo_caption_japanese: string | null;
}

/** A place in "Which exit?" and the exits that lead to it. */
export interface StationPageExitPlace {
  name: string;
  name_japanese: string | null;
  category: string;
  exits: { exit_id: number; note: string | null; note_japanese: string | null }[];
}

/** Operator of the station used for the "Full station map" link. */
export interface StationPageOperatorSite {
  name: string;
  name_japanese: string | null;
  url: string;
}

export interface StationPageSeason {
  season: "spring" | "summer" | "autumn" | "winter";
  months: string | null;
  months_japanese: string | null;
  description: string | null;
  description_japanese: string | null;
}

/** One row of the one facilities table: a facility on a floor, with its description and photo. */
export interface StationPageGuideItem {
  name: string;
  name_japanese: string | null;
  floor_name: string;
  floor_name_japanese: string | null;
  location_type: string;
  count: number | null;
  exit_names: string[];
  exit_names_japanese: string[];
  description: string | null;
  description_japanese: string | null;
  photo: string | null;
  photo_caption: string | null;
  photo_caption_japanese: string | null;
}

export interface StationPageTransport {
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
}

export interface StationPageThing {
  name: string;
  name_japanese: string | null;
  kind: string | null;
  kind_japanese: string | null;
  location: string | null;
  location_japanese: string | null;
  cost: string | null;
  cost_japanese: string | null;
  description: string | null;
  description_japanese: string | null;
  map_url: string | null;
  photo: string | null;
}

interface PlaceRow extends StationPagePlace {
  pid: number;
  cost?: string | null;
  cost_japanese?: string | null;
  exit_id: number | null;
  walking_minutes: number | null;
}

/** "Exit name · N min · free text" in both languages, built from the one place record. */
function composeWhere(rows: PlaceRow[], exitNames: Map<number, { en: string; ja: string | null }>) {
  return rows.map((r) => {
    let ex = r.exit_id ? exitNames.get(r.exit_id) : undefined;
    // Rows moved over from the old "Things to do" already name the exit in their text: don't say it twice.
    if (ex && r.location && r.location.toLowerCase().includes(ex.en.toLowerCase())) ex = undefined;
    const en = [ex?.en, r.walking_minutes != null ? `${r.walking_minutes} min` : null, r.location].filter(Boolean).join(" · ");
    const ja = [ex?.ja ?? ex?.en, r.walking_minutes != null ? `徒歩${r.walking_minutes}分` : null, r.location_japanese ?? r.location]
      .filter(Boolean).join(" · ");
    return { ...r, location: en || null, location_japanese: ja || null };
  });
}

export interface StationPagePlace {
  name: string;
  name_japanese: string | null;
  kind: string | null;
  kind_japanese: string | null;
  location: string | null;
  location_japanese: string | null;
  description: string | null;
  description_japanese: string | null;
  map_url: string | null;
  photo: string | null;
  booking_url?: string | null;
}

export interface StationPageDayTrip {
  name: string;
  name_japanese: string | null;
  travel_time: string | null;
  travel_time_japanese: string | null;
  transport: string | null;
  transport_japanese: string | null;
  description: string | null;
  description_japanese: string | null;
  map_url: string | null;
  photo: string | null;
}

export interface StationPageFaq {
  question: string;
  question_japanese: string | null;
  answer: string;
  answer_japanese: string | null;
}

export interface StationPageTip {
  tip: string;
  tip_japanese: string | null;
}

export interface StationPageData {
  id: number;
  slug: string;
  name: string;
  name_japanese: string | null;
  description: string | null;
  description_japanese: string | null;
  is_verified: number;
  verified_at: string | null;
  location_url: string | null;
  region: string | null;
  region_japanese: string | null;
  sides_note: string | null;
  routes_note: string | null;
  exits_note: string | null;
  exits_note_japanese: string | null;
  restaurants_note: string | null;
  restaurants_note_japanese: string | null;
  routes_note_japanese: string | null;
  sides_note_japanese: string | null;
  address: string | null;
  address_japanese: string | null;
  main_image: string | null;
  updated_at: string | null;
  stat_lines_note: string | null;
  stat_lines_note_japanese: string | null;
  stat_riders_value: string | null;
  stat_riders_note: string | null;
  stat_riders_note_japanese: string | null;
  stat_opened_value: string | null;
  stat_opened_note: string | null;
  stat_opened_note_japanese: string | null;
  lines: StationPageLine[];
  facilities: StationPageFacility[];
  platforms: StationPagePlatform[];
  sides: StationPageSide[];
  routes: StationPageRoute[];
  exits: StationPageExit[];
  tips: StationPageTip[];
  seasons: StationPageSeason[];
  practical: StationPageTip[];
  faqs: StationPageFaq[];
  dayTrips: StationPageDayTrip[];
  facilityGuide: StationPageGuideItem[];
  transport: StationPageTransport[];
  things: StationPageThing[];
  hotels: StationPagePlace[];
  restaurants: StationPagePlace[];
  exitPlaces: StationPageExitPlace[];
  operatorSite: StationPageOperatorSite | null;
}

export async function getStationPage(
  db: D1Database,
  slug: string,
): Promise<StationPageData | null> {
  const station = await db
    .prepare(
      `SELECT id, slug, name, name_japanese, description, description_japanese,
              is_verified, verified_at, location_url, region, region_japanese, address, address_japanese,
              sides_note, sides_note_japanese, routes_note, routes_note_japanese, exits_note, exits_note_japanese, restaurants_note, restaurants_note_japanese,
              main_image, updated_at,
              stat_lines_note, stat_lines_note_japanese,
              stat_riders_value, stat_riders_note, stat_riders_note_japanese,
              stat_opened_value, stat_opened_note, stat_opened_note_japanese
       FROM stations WHERE slug = ?`,
    )
    .bind(slug)
    .first<Omit<StationPageData, "lines" | "facilities" | "platforms" | "sides" | "routes" | "exits" | "tips" | "seasons" | "practical" | "faqs" | "dayTrips" | "facilityGuide" | "transport" | "things" | "hotels" | "restaurants" | "exitPlaces" | "operatorSite">>();

  if (!station) return null;

  const lines = db
    .prepare(
      `SELECT l.id, l.name, l.name_japanese, l.color, l.code, ls.station_code,
              o.name AS operator_name, o.name_japanese AS operator_name_japanese
       FROM line_stations ls
       JOIN lines l ON l.id = ls.line_id
       LEFT JOIN operators o ON o.id = l.operator_id
       WHERE ls.station_id = ? AND l.website_status != 'hidden'
       ORDER BY ls.id`,
    )
    .bind(station.id)
    .all<Omit<StationPageLine, "prev" | "next">>();

  // Previous / next station on each line (a loop line wraps around). All lines are queried at once.
  const lineRows = (await lines).results ?? [];
  const neighborQueries = lineRows.map((line) =>
    db
      .prepare(
        `SELECT s.id, s.slug, s.name, s.name_japanese, s.is_verified, ls.station_code AS code
         FROM line_stations ls JOIN stations s ON s.id = ls.station_id
         WHERE ls.line_id = ? ORDER BY ls.station_order`,
      )
      .bind(line.id)
      .all<{ id: number; slug: string; name: string; name_japanese: string | null; is_verified: number; code: string | null }>(),
  );
  const neighborResults = await Promise.all(neighborQueries);
  const withNeighbors: StationPageLine[] = lineRows.map((line, k) => {
    const list = neighborResults[k].results ?? [];
    const at = list.findIndex((r) => r.id === station.id);
    const isLoop = line.code === "JY" || /yamanote/i.test(line.name);
    const pick = (i: number): StationPageNeighbor | null => {
      if (at < 0 || list.length < 2) return null;
      const j = isLoop ? (i + list.length) % list.length : i;
      const r = list[j];
      if (!r || r.id === station.id) return null;
      return { slug: r.slug, name: r.name, name_japanese: r.name_japanese, code: r.code, verified: Number(r.is_verified) === 1 };
    };
    return { ...line, prev: pick(at - 1), next: pick(at + 1) };
  });

  // Facilities this station has (each once), grouped by category.
  const facilities = db
    .prepare(
      `SELECT f.id, f.name, f.name_japanese, f.slug, f.icon, f.icon_dark, f.category
       FROM facilities f
       WHERE f.id IN (
         SELECT sff.facility_id
         FROM station_floor_facilities sff
         JOIN station_floors sf ON sf.id = sff.floor_id
         WHERE sf.station_id = ?
       )
       ORDER BY CASE f.category
                  WHEN 'storage' THEN 1 WHEN 'tickets' THEN 2 WHEN 'access' THEN 3
                  WHEN 'shops' THEN 4 WHEN 'transport' THEN 5 ELSE 6 END,
                f.sort_order, f.name`,
    )
    .bind(station.id)
    .all<StationPageFacility>();

  const platforms = db
    .prepare(
      `SELECT sp.line_id, sp.platform_number, sp.destinations, sp.destinations_japanese,
              l.name AS line_name, l.name_japanese AS line_name_japanese,
              l.color AS line_color,
              sp.platform_group AS "group",
              sp.platform_group_japanese AS group_japanese
       FROM station_platforms sp
       LEFT JOIN lines l ON l.id = sp.line_id
       WHERE sp.station_id = ?
       ORDER BY sp.sort_order, sp.platform_number`,
    )
    .bind(station.id)
    .all<StationPagePlatform>();

  const sides = db
    .prepare(
      `SELECT id, name, name_japanese, subtitle, subtitle_japanese, description, description_japanese
       FROM station_sides WHERE station_id = ? ORDER BY sort_order, id`,
    )
    .bind(station.id)
    .all<Omit<StationPageSide, "exit_ids">>();

  const sideLinks = db
    .prepare(
      `SELECT se.side_id, se.exit_id FROM station_side_exits se
       JOIN station_sides s ON s.id = se.side_id WHERE s.station_id = ?`,
    )
    .bind(station.id)
    .all<{ side_id: number; exit_id: number }>();
  const exitIdsBySide = new Map<number, number[]>();
  for (const l of (await sideLinks).results ?? []) {
    exitIdsBySide.set(l.side_id, [...(exitIdsBySide.get(l.side_id) ?? []), l.exit_id]);
  }

  const exitPlaceRows = db
    .prepare(
      `SELECT id, name, name_japanese, category FROM station_exit_places
       WHERE station_id = ? AND category IN ('transport', 'help') ORDER BY sort_order, id`,
    )
    .bind(station.id)
    .all<{ id: number; name: string; name_japanese: string | null; category: string }>();
  const exitPlaceLinks = db
    .prepare(
      `SELECT pe.place_id, pe.exit_id, pe.note, pe.note_japanese
       FROM station_exit_place_exits pe JOIN station_exit_places p ON p.id = pe.place_id
       WHERE p.station_id = ?`,
    )
    .bind(station.id)
    .all<{ place_id: number; exit_id: number; note: string | null; note_japanese: string | null }>();
  const exitPlaceLinkRows = (await exitPlaceLinks).results ?? [];
  const otherExitPlaces: StationPageExitPlace[] = ((await exitPlaceRows).results ?? []).map((p) => ({
    name: p.name,
    name_japanese: p.name_japanese,
    category: p.category,
    exits: exitPlaceLinkRows
      .filter((l) => l.place_id === p.id)
      .map((l) => ({ exit_id: l.exit_id, note: l.note, note_japanese: l.note_japanese })),
  }));

  const routes = db
    .prepare(
      `SELECT from_place, from_place_japanese, route, route_japanese, travel_time,
              travel_time_japanese, cost, cost_japanese
       FROM station_routes WHERE station_id = ? ORDER BY sort_order, id`,
    )
    .bind(station.id)
    .all<StationPageRoute>();

  const exits = db
    .prepare(
      `SELECT e.id, e.color_code, e.code, e.name, e.name_japanese, e.description, e.description_japanese,
              e.photo, e.photo_caption, e.photo_caption_japanese
       FROM station_exits e LEFT JOIN station_floors f ON f.id = e.floor_id
       WHERE e.station_id = ?
       ORDER BY COALESCE(f.floor_order, 0) DESC, e.sort_order, e.id`,
    )
    .bind(station.id)
    .all<StationPageExit>();


  const seasons = db
    .prepare(
      `SELECT season, months, months_japanese, description, description_japanese
       FROM station_seasons WHERE station_id = ?`,
    )
    .bind(station.id)
    .all<StationPageSeason>();

  const practical = db
    .prepare(`SELECT tip, tip_japanese FROM station_tips WHERE station_id = ? AND section = 'practical' ORDER BY sort_order, id`)
    .bind(station.id)
    .all<StationPageTip>();
  const faqs = db
    .prepare(
      `SELECT question, question_japanese, answer, answer_japanese
       FROM station_faqs WHERE station_id = ? ORDER BY sort_order, id`,
    )
    .bind(station.id)
    .all<StationPageFaq>();

  const dayTrips = db
    .prepare(
      `SELECT name, name_japanese, travel_time, travel_time_japanese, transport, transport_japanese,
              description, description_japanese, map_url, photo
       FROM station_day_trips WHERE station_id = ? ORDER BY sort_order, id`,
    )
    .bind(station.id)
    .all<StationPageDayTrip>();

  const facilityGuideQ = db
    .prepare(
      `SELECT f.name, f.name_japanese, sf.name AS floor_name, sf.name_japanese AS floor_name_japanese,
              sff.location_type, sff.facility_count AS count,
              sff.description AS description, sff.description_japanese AS description_japanese,
              sff.photo, sff.photo_caption, sff.photo_caption_japanese,
              (SELECT json_group_array(se.name) FROM station_floor_facility_exits x
                 JOIN station_exits se ON se.id = x.station_exit_id
                 WHERE x.station_floor_facility_id = sff.id) AS exit_names,
              (SELECT json_group_array(COALESCE(se.name_japanese, se.name)) FROM station_floor_facility_exits x
                 JOIN station_exits se ON se.id = x.station_exit_id
                 WHERE x.station_floor_facility_id = sff.id) AS exit_names_japanese
       FROM station_floor_facilities sff
       JOIN station_floors sf ON sf.id = sff.floor_id
       JOIN facilities f ON f.id = sff.facility_id
       WHERE sf.station_id = ?
       ORDER BY sf.floor_order, sff.sort_order, f.sort_order, f.name`,
    )
    .bind(station.id)
    .all<Omit<StationPageGuideItem, "exit_names" | "exit_names_japanese"> & { exit_names: string; exit_names_japanese: string }>();

  const transport = db
    .prepare(
      `SELECT place, place_japanese, service, service_japanese, notes, notes_japanese, photo, photo_title,
              photo_title_japanese, photo_caption, photo_caption_japanese
       FROM station_transport WHERE station_id = ? ORDER BY sort_order, id`,
    )
    .bind(station.id)
    .all<StationPageTransport>();

  // One table per place type, each linked to the station with an exit + walking minutes:
  // Things to do = places (top_picks) picked in station_things; Top picks (map) are station_top_picks.
  const things = db
    .prepare(
      `SELECT p.id AS pid, p.name, p.name_japanese, p.kind, p.kind_japanese, l.location, l.location_japanese,
              p.entry_fee AS cost, p.entry_fee_japanese AS cost_japanese,
              p.description, p.description_japanese, p.map_url, p.image_url AS photo,
              l.exit_id, e.name AS exit_name, e.name_japanese AS exit_name_japanese, l.walking_minutes
       FROM station_things l JOIN top_picks p ON p.id = l.top_pick_id
       LEFT JOIN station_exits e ON e.id = l.exit_id
       WHERE l.station_id = ? ORDER BY l.sort_order, p.name`,
    )
    .bind(station.id)
    .all<PlaceRow & { pid: number; cost: string | null; cost_japanese: string | null }>();

  const hotels = db
    .prepare(
      `SELECT h.id AS pid, h.name, h.name_japanese, h.kind, h.kind_japanese, l.location, l.location_japanese,
              h.description, h.description_japanese, h.map_url, h.photo, h.booking_url,
              l.exit_id, e.name AS exit_name, e.name_japanese AS exit_name_japanese, l.walking_minutes
       FROM station_hotels l JOIN hotels h ON h.id = l.hotel_id
       LEFT JOIN station_exits e ON e.id = l.exit_id
       WHERE l.station_id = ? ORDER BY l.sort_order, h.name`,
    )
    .bind(station.id)
    .all<PlaceRow & { pid: number }>();
  const restaurants = db
    .prepare(
      `SELECT r.id AS pid, r.name, r.name_japanese, r.kind, r.kind_japanese, l.location, l.location_japanese,
              r.description, r.description_japanese, r.map_url, r.photo,
              l.exit_id, e.name AS exit_name, e.name_japanese AS exit_name_japanese, l.walking_minutes
       FROM station_restaurants l JOIN restaurants r ON r.id = l.restaurant_id
       LEFT JOIN station_exits e ON e.id = l.exit_id
       WHERE l.station_id = ? ORDER BY l.sort_order, r.name`,
    )
    .bind(station.id)
    .all<PlaceRow & { pid: number }>();

  // The operator with the most lines here (and a website) is the one the "Full station map" button opens.
  const opRowsQ = db
    .prepare(
      `SELECT o.name, o.name_japanese, o.website_url AS url, COUNT(*) AS n
       FROM line_stations ls
       JOIN lines l ON l.id = ls.line_id
       JOIN operators o ON o.id = l.operator_id
       WHERE ls.station_id = ? AND l.website_status != 'hidden' AND o.website_url IS NOT NULL AND o.website_url != ''
       GROUP BY o.id ORDER BY n DESC, o.name LIMIT 1`,
    )
    .bind(station.id)
    .first<StationPageOperatorSite>();
  const opRows = await opRowsQ;
  const operatorSite = opRows && /^https?:\/\//i.test(opRows.url) ? opRows : null;

  const tips = db
    .prepare(`SELECT tip, tip_japanese FROM station_tips WHERE station_id = ? AND section = 'exits' ORDER BY sort_order, id`)
    .bind(station.id)
    .all<StationPageTip>();

  const exitRows = (await exits).results ?? [];
  const exitNames = new Map(exitRows.map((e) => [e.id, { en: e.name, ja: e.name_japanese }]));
  const thingRows = composeWhere((await things).results ?? [], exitNames);
  const hotelRows = composeWhere((await hotels).results ?? [], exitNames);
  const restaurantRows = composeWhere((await restaurants).results ?? [], exitNames);
  // "Which exit?" lists the sights, food and hotels that are tied to an exit, plus transport and help.
  const toExitPlaces = (rows: PlaceRow[], orig: PlaceRow[], category: string): StationPageExitPlace[] =>
    orig.flatMap((r, i) => {
      if (!r.exit_id) return [];
      const en = [r.walking_minutes != null ? `${r.walking_minutes} min` : null, r.location].filter(Boolean).join(" · ") || null;
      const ja = [r.walking_minutes != null ? `徒歩${r.walking_minutes}分` : null, r.location_japanese ?? r.location].filter(Boolean).join(" · ") || null;
      return [{
        name: rows[i].name, name_japanese: rows[i].name_japanese, category,
        exits: [{ exit_id: r.exit_id, note: en, note_japanese: ja }],
      }];
    });
  const exitPlaces = [
    ...toExitPlaces(thingRows, (await things).results ?? [], "sights"),
    ...toExitPlaces(restaurantRows, (await restaurants).results ?? [], "food"),
    ...toExitPlaces(hotelRows, (await hotels).results ?? [], "hotels"),
    ...otherExitPlaces,
  ];

  return {
    ...station,
    exits: exitRows,
    exitPlaces,
    operatorSite,
    tips: (await tips).results ?? [],
    practical: (await practical).results ?? [],
    faqs: (await faqs).results ?? [],
    dayTrips: (await dayTrips).results ?? [],
    facilityGuide: ((await facilityGuideQ).results ?? []).map((r) => ({
      ...r,
      exit_names: JSON.parse(r.exit_names || "[]") as string[],
      exit_names_japanese: JSON.parse(r.exit_names_japanese || "[]") as string[],
    })),
    transport: (await transport).results ?? [],
    things: thingRows.map((t) => ({ ...t, cost: t.cost ?? null, cost_japanese: t.cost_japanese ?? null })),
    hotels: hotelRows,
    restaurants: restaurantRows,
    seasons: ((await seasons).results ?? []).sort(
      (a, b) => ["spring", "summer", "autumn", "winter"].indexOf(a.season) - ["spring", "summer", "autumn", "winter"].indexOf(b.season),
    ),
    routes: (await routes).results ?? [],
    sides: ((await sides).results ?? []).map((sd) => ({ ...sd, exit_ids: exitIdsBySide.get(sd.id) ?? [] })),
    platforms: (await platforms).results ?? [],
    lines: withNeighbors,
    facilities: (await facilities).results ?? [],
  };
}
