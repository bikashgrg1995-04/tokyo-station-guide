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
}

export async function getStationPage(
  db: D1Database,
  slug: string,
): Promise<StationPageData | null> {
  const station = await db
    .prepare(
      `SELECT id, slug, name, name_japanese, description, description_japanese,
              is_verified, verified_at, location_url, region, region_japanese,
              main_image, updated_at,
              stat_lines_note, stat_lines_note_japanese,
              stat_riders_value, stat_riders_note, stat_riders_note_japanese,
              stat_opened_value, stat_opened_note, stat_opened_note_japanese
       FROM stations WHERE slug = ?`,
    )
    .bind(slug)
    .first<Omit<StationPageData, "lines" | "facilities">>();

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
    .all<StationPageLine>();

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

  return {
    ...station,
    lines: lines.results ?? [],
    facilities: facilities.results ?? [],
  };
}
