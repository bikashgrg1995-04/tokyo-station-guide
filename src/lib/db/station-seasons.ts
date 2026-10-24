export const SEASONS = ["spring", "summer", "autumn", "winter"] as const;
export type Season = (typeof SEASONS)[number];

export interface StationSeason {
  season: Season;
  months: string | null;
  months_japanese: string | null;
  description: string | null;
  description_japanese: string | null;
}

export async function getStationSeasons(db: D1Database, stationId: number): Promise<StationSeason[]> {
  const r = await db
    .prepare(
      `SELECT season, months, months_japanese, description, description_japanese
       FROM station_seasons WHERE station_id = ?`,
    )
    .bind(stationId)
    .all<StationSeason>();
  const rows = r.results ?? [];
  return SEASONS.flatMap((s) => rows.filter((x) => x.season === s));
}

/** Saves one season; when everything is empty the row is removed. */
export async function saveStationSeason(
  db: D1Database,
  stationId: number,
  season: Season,
  v: { months: string | null; monthsJa: string | null; desc: string | null; descJa: string | null },
) {
  if (!v.months && !v.monthsJa && !v.desc && !v.descJa) {
    await db.prepare(`DELETE FROM station_seasons WHERE station_id = ? AND season = ?`).bind(stationId, season).run();
    return;
  }
  await db
    .prepare(
      `INSERT INTO station_seasons (station_id, season, months, months_japanese, description, description_japanese)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(station_id, season) DO UPDATE SET
         months = excluded.months, months_japanese = excluded.months_japanese,
         description = excluded.description, description_japanese = excluded.description_japanese,
         updated_at = CURRENT_TIMESTAMP`,
    )
    .bind(stationId, season, v.months, v.monthsJa, v.desc, v.descJa)
    .run();
}
