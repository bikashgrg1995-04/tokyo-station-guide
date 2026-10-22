/* ========================================
   Read stations
======================================== */

import type {
  StationListItem,
  StationAdminListItem,
  StationEditItem,
  PaginatedStations,
} from "./types";
import {
  getStationFacilitiesJson,
  getStationTopPicksJson,
  getStationConnectionsJson,
  getStationPlatformsJson,
} from "./relations";

/* ========================================
   Get Stations
======================================== */

export async function getStations(db: D1Database): Promise<StationListItem[]> {
  const result = await db
    .prepare(
      `
        SELECT
          id,
          name,
          name_japanese,
          slug
        FROM stations
        ORDER BY name ASC
      `,
    )
    .all<StationListItem>();

  return result.results;
}

/* ========================================
   Get Stations For Admin - Paginated
======================================== */

export async function getAdminStationsPaginated(
  db: D1Database,
  options: {
    page?: number;
    perPage?: number;
    search?: string;
    lineId?: number;
  } = {},
): Promise<PaginatedStations> {
  const perPage = Math.max(1, options.perPage ?? 10);

  const requestedPage = Math.max(1, options.page ?? 1);

  const search = options.search?.trim() ?? "";

  const searchValue = `%${search}%`;

  const lineId = Number.isInteger(options.lineId) ? Number(options.lineId) : 0;

  const countResult = await db
    .prepare(
      `
        SELECT COUNT(*) AS total
        FROM stations
        WHERE
          (
            ? = ''
            OR name LIKE ?
            OR name_japanese LIKE ?
            OR slug LIKE ?
            OR description LIKE ?
          )
          AND (
            ? = 0
            OR id IN (
              SELECT station_id FROM line_stations WHERE line_id = ?
            )
          )
      `,
    )
    .bind(search, searchValue, searchValue, searchValue, searchValue, lineId, lineId)
    .first<{ total: number }>();

  const totalItems = Number(countResult?.total ?? 0);

  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));

  const currentPage = Math.min(requestedPage, totalPages);

  const offset = (currentPage - 1) * perPage;

  const result = await db
    .prepare(
      `
        SELECT
          id,
          name,
          name_japanese,
          slug,
          location_url,
          description,
          is_verified,
          verified_at,
          created_at,
          updated_at
        FROM stations
        WHERE
          (
            ? = ''
            OR name LIKE ?
            OR name_japanese LIKE ?
            OR slug LIKE ?
            OR description LIKE ?
          )
          AND (
            ? = 0
            OR id IN (
              SELECT station_id FROM line_stations WHERE line_id = ?
            )
          )
        ORDER BY name ASC
        LIMIT ? OFFSET ?
      `,
    )
    .bind(
      search,
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      lineId,
      lineId,
      perPage,
      offset,
    )
    .all<StationAdminListItem>();

  return {
    items: result.results,
    totalItems,
    currentPage,
    totalPages,
    perPage,
  };
}

/* ========================================
   Get Station By ID
======================================== */

export async function getStationById(
  db: D1Database,
  id: number,
): Promise<StationEditItem | null> {
  const station = await db
    .prepare(
      `
        SELECT
          id,
          name,
          name_japanese,
          slug,
          location_url,
          description,
          description_japanese,
          about,
          about_japanese,
          region,
          region_japanese,
          main_image,
          is_verified,
          verified_at,
          created_at,
          updated_at
        FROM stations
        WHERE id = ?
        LIMIT 1
      `,
    )
    .bind(id)
    .first<
      StationAdminListItem & {
        description_japanese: string | null;
        about: string | null;
        about_japanese: string | null;
        region: string | null;
        region_japanese: string | null;
        main_image: string | null;
      }
    >();

  if (!station) {
    return null;
  }

  const facilities = await getStationFacilitiesJson(db, station.id);

  const topPicks = await getStationTopPicksJson(db, station.id);

  const connections = await getStationConnectionsJson(db, station.id);

  const platforms = await getStationPlatformsJson(db, station.id);

  return {
    ...station,
    facilities,
    top_picks: topPicks,
    connections,
    platforms,
  };
}
