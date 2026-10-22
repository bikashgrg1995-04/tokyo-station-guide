/** Data for the public station page (/station/<slug>). Starts small: the page grows section by section. */

export interface StationPageLine {
  id: number;
  name: string;
  name_japanese: string | null;
  color: string | null;
  code: string | null;
  station_code: string | null;
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
  lines: StationPageLine[];
}

export async function getStationPage(
  db: D1Database,
  slug: string,
): Promise<StationPageData | null> {
  const station = await db
    .prepare(
      `SELECT id, slug, name, name_japanese, description, description_japanese,
              is_verified, verified_at
       FROM stations WHERE slug = ?`,
    )
    .bind(slug)
    .first<Omit<StationPageData, "lines">>();

  if (!station) return null;

  const lines = await db
    .prepare(
      `SELECT l.id, l.name, l.name_japanese, l.color, l.code, ls.station_code
       FROM line_stations ls
       JOIN lines l ON l.id = ls.line_id
       WHERE ls.station_id = ? AND l.website_status != 'hidden'
       ORDER BY l.name`,
    )
    .bind(station.id)
    .all<StationPageLine>();

  return { ...station, lines: lines.results ?? [] };
}
