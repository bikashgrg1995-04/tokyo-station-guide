/* ========================================
   Read stations
======================================== */

import type {
  StationLine,
  Station,
  StationListItem,
  StationAdminListItem,
  StationEditItem,
  PaginatedStations,
} from "./types";
import {
  getStationFacilitiesJson,
  getStationFacilityDetailsJson,
  getStationTopPicksJson,
  getStationConnectionsJson,
  getStationPlatformsJson,
} from "./relations";

/* ========================================
   Get Station By Slug
======================================== */

export async function getStationBySlug(
  db: D1Database,
  slug: string,
): Promise<Station | null> {
  const station = await db
    .prepare(
      `
        SELECT
          id,
          name,
          name_japanese,
          slug,
          latitude,
          longitude,
          description,
          about,
          is_verified,
          verified_at,
          created_at,
          updated_at
        FROM stations
        WHERE slug = ?
        LIMIT 1
      `,
    )
    .bind(slug)
    .first<
      Omit<Station, "lines" | "facilities" | "top_picks" | "connections">
    >();

  if (!station) {
    return null;
  }

  const lines = await db
    .prepare(
      `
        SELECT
          l.id,
          l.name,
          l.slug,
          l.code,
          o.name AS operator_name
        FROM line_stations ls
        INNER JOIN lines l
          ON l.id = ls.line_id
        INNER JOIN operators o
          ON o.id = l.operator_id
        WHERE ls.station_id = ?
        ORDER BY ls.station_order ASC
      `,
    )
    .bind(station.id)
    .all<StationLine>();

  const facilities = await getStationFacilitiesJson(db, station.id);

  const facilityDetails = await getStationFacilityDetailsJson(db, station.id);

  const topPicks = await getStationTopPicksJson(db, station.id);

  const connections = await getStationConnectionsJson(db, station.id);

  const platforms = await getStationPlatformsJson(db, station.id);

  return {
    ...station,
    facilities,
    facility_details: facilityDetails,
    top_picks: topPicks,
    connections,
    platforms,
    lines: lines.results,
  };
}

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
  } = {},
): Promise<PaginatedStations> {
  const perPage = Math.max(1, options.perPage ?? 10);

  const requestedPage = Math.max(1, options.page ?? 1);

  const search = options.search?.trim() ?? "";

  const searchValue = `%${search}%`;

  const countResult = await db
    .prepare(
      `
        SELECT COUNT(*) AS total
        FROM stations
        WHERE
          ? = ''
          OR name LIKE ?
          OR name_japanese LIKE ?
          OR slug LIKE ?
          OR description LIKE ?
      `,
    )
    .bind(search, searchValue, searchValue, searchValue, searchValue)
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
          latitude,
          longitude,
          description,
          is_verified,
          verified_at,
          created_at,
          updated_at
        FROM stations
        WHERE
          ? = ''
          OR name LIKE ?
          OR name_japanese LIKE ?
          OR slug LIKE ?
          OR description LIKE ?
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
          latitude,
          longitude,
          description,
          about,
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
        about: string | null;
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
