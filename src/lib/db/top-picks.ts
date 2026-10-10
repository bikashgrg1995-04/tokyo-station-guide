export interface TopPick {
  id: number;
  name: string;
  name_japanese: string | null;
  slug: string;
  category: string;
  description: string | null;
  image_url: string | null;
}

export interface StationTopPick {
  id: number;
  name: string;
  name_japanese: string | null;
  slug: string;
  category: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  walking_minutes: number | null;
}

export async function getTopPicks(
  db: D1Database,
): Promise<TopPick[]> {
  const result = await db
    .prepare(
      `
        SELECT
          id,
          name,
          name_japanese,
          slug,
          category,
          description,
          image_url
        FROM top_picks
        ORDER BY name ASC
      `,
    )
    .all<TopPick>();

  return result.results;
}

export async function getStationTopPicks(
  db: D1Database,
  stationId: number,
): Promise<StationTopPick[]> {
  const result = await db
    .prepare(
      `
        SELECT
          tp.id,
          tp.name,
          tp.name_japanese,
          tp.slug,
          tp.category,
          tp.description,
          tp.image_url,
          stp.sort_order,
          stp.walking_minutes
        FROM station_top_picks stp
        INNER JOIN top_picks tp
          ON tp.id = stp.top_pick_id
        WHERE stp.station_id = ?
        ORDER BY stp.sort_order ASC, tp.name ASC
      `,
    )
    .bind(stationId)
    .all<StationTopPick>();

  return result.results;
}

export async function getAvailableTopPicksForStation(
  db: D1Database,
  stationId: number,
): Promise<TopPick[]> {
  const result = await db
    .prepare(
      `
        SELECT
          tp.id,
          tp.name,
          tp.name_japanese,
          tp.slug,
          tp.category,
          tp.description,
          tp.image_url
        FROM top_picks tp
        WHERE NOT EXISTS (
          SELECT 1
          FROM station_top_picks stp
          WHERE stp.station_id = ?
            AND stp.top_pick_id = tp.id
        )
        ORDER BY tp.name ASC
      `,
    )
    .bind(stationId)
    .all<TopPick>();

  return result.results;
}


