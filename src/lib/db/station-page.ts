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
  name: string;
  name_japanese: string | null;
  description: string | null;
  description_japanese: string | null;
  photo: string | null;
  photo_caption: string | null;
  photo_caption_japanese: string | null;
}

export interface StationPageSeason {
  season: "spring" | "summer" | "autumn" | "winter";
  months: string | null;
  months_japanese: string | null;
  description: string | null;
  description_japanese: string | null;
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
}

export async function getStationPage(
  db: D1Database,
  slug: string,
): Promise<StationPageData | null> {
  const station = await db
    .prepare(
      `SELECT id, slug, name, name_japanese, description, description_japanese,
              is_verified, verified_at, location_url, region, region_japanese, address, address_japanese,
              sides_note, sides_note_japanese, routes_note, routes_note_japanese, exits_note, exits_note_japanese,
              main_image, updated_at,
              stat_lines_note, stat_lines_note_japanese,
              stat_riders_value, stat_riders_note, stat_riders_note_japanese,
              stat_opened_value, stat_opened_note, stat_opened_note_japanese
       FROM stations WHERE slug = ?`,
    )
    .bind(slug)
    .first<Omit<StationPageData, "lines" | "facilities" | "platforms" | "sides" | "routes" | "exits" | "tips" | "seasons">>();

  if (!station) return null;

  const lines = await db
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

  // Previous / next station on each line (a loop line wraps around).
  const withNeighbors: StationPageLine[] = [];
  for (const line of lines.results ?? []) {
    const rows = await db
      .prepare(
        `SELECT s.id, s.slug, s.name, s.name_japanese, s.is_verified, ls.station_code AS code
         FROM line_stations ls JOIN stations s ON s.id = ls.station_id
         WHERE ls.line_id = ? ORDER BY ls.station_order`,
      )
      .bind(line.id)
      .all<{ id: number; slug: string; name: string; name_japanese: string | null; is_verified: number; code: string | null }>();
    const list = rows.results ?? [];
    const at = list.findIndex((r) => r.id === station.id);
    const isLoop = line.code === "JY" || /yamanote/i.test(line.name);
    const pick = (i: number): StationPageNeighbor | null => {
      if (at < 0 || list.length < 2) return null;
      const j = isLoop ? (i + list.length) % list.length : i;
      const r = list[j];
      if (!r || r.id === station.id) return null;
      return { slug: r.slug, name: r.name, name_japanese: r.name_japanese, code: r.code, verified: Number(r.is_verified) === 1 };
    };
    withNeighbors.push({ ...line, prev: pick(at - 1), next: pick(at + 1) });
  }

  // Facilities this station has (each once), grouped by category.
  const facilities = await db
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

  const platforms = await db
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

  const sides = await db
    .prepare(
      `SELECT name, name_japanese, subtitle, subtitle_japanese, description, description_japanese
       FROM station_sides WHERE station_id = ? ORDER BY sort_order, id`,
    )
    .bind(station.id)
    .all<StationPageSide>();

  const routes = await db
    .prepare(
      `SELECT from_place, from_place_japanese, route, route_japanese, travel_time,
              travel_time_japanese, cost, cost_japanese
       FROM station_routes WHERE station_id = ? ORDER BY sort_order, id`,
    )
    .bind(station.id)
    .all<StationPageRoute>();

  const exits = await db
    .prepare(
      `SELECT e.name, e.name_japanese, e.description, e.description_japanese,
              e.photo, e.photo_caption, e.photo_caption_japanese
       FROM station_exits e LEFT JOIN station_floors f ON f.id = e.floor_id
       WHERE e.station_id = ?
       ORDER BY COALESCE(f.floor_order, 0) DESC, e.sort_order, e.id`,
    )
    .bind(station.id)
    .all<StationPageExit>();


  const seasons = await db
    .prepare(
      `SELECT season, months, months_japanese, description, description_japanese
       FROM station_seasons WHERE station_id = ?`,
    )
    .bind(station.id)
    .all<StationPageSeason>();

  const tips = await db
    .prepare(`SELECT tip, tip_japanese FROM station_tips WHERE station_id = ? ORDER BY sort_order, id`)
    .bind(station.id)
    .all<StationPageTip>();

  return {
    ...station,
    exits: exits.results ?? [],
    tips: tips.results ?? [],
    seasons: (seasons.results ?? []).sort(
      (a, b) => ["spring", "summer", "autumn", "winter"].indexOf(a.season) - ["spring", "summer", "autumn", "winter"].indexOf(b.season),
    ),
    routes: routes.results ?? [],
    sides: sides.results ?? [],
    platforms: platforms.results ?? [],
    lines: withNeighbors,
    facilities: facilities.results ?? [],
  };
}
