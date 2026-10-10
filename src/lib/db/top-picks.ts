/* ========================================
   Top Picks Database Helpers
======================================== */

export const TOP_PICK_CATEGORIES = [
  "landmark",
  "food",
  "shopping",
  "museum",
  "park",
  "temple",
] as const;

export type TopPickCategory = (typeof TOP_PICK_CATEGORIES)[number];

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

export interface TopPickInput {
  name: string;
  nameJapanese?: string | null;
  slug: string;
  category: TopPickCategory;
  description?: string | null;
  imageUrl?: string | null;
}

export interface PaginatedTopPicks {
  items: TopPick[];
  totalItems: number;
  currentPage: number;
  totalPages: number;
  perPage: number;
}

/* ========================================
   Get All Top Picks
======================================== */

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

/* ========================================
   Get Paginated Top Picks
======================================== */

export async function getTopPicksPaginated(
  db: D1Database,
  options: {
    page?: number;
    perPage?: number;
    search?: string;
  } = {},
): Promise<PaginatedTopPicks> {
  const perPage = Math.max(1, options.perPage ?? 10);
  const requestedPage = Math.max(1, options.page ?? 1);
  const search = options.search?.trim() ?? "";
  const searchValue = `%${search}%`;

  const countResult = await db
    .prepare(
      `
        SELECT COUNT(*) AS total
        FROM top_picks
        WHERE
          ? = ''
          OR name LIKE ?
          OR name_japanese LIKE ?
          OR slug LIKE ?
          OR category LIKE ?
          OR description LIKE ?
      `,
    )
    .bind(
      search,
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      searchValue,
    )
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
          category,
          description,
          image_url
        FROM top_picks
        WHERE
          ? = ''
          OR name LIKE ?
          OR name_japanese LIKE ?
          OR slug LIKE ?
          OR category LIKE ?
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
      searchValue,
      perPage,
      offset,
    )
    .all<TopPick>();

  return {
    items: result.results,
    totalItems,
    currentPage,
    totalPages,
    perPage,
  };
}

/* ========================================
   Get Top Pick By ID
======================================== */

export async function getTopPickById(
  db: D1Database,
  id: number,
): Promise<TopPick | null> {
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
        WHERE id = ?
        LIMIT 1
      `,
    )
    .bind(id)
    .first<TopPick>();

  return result ?? null;
}

/* ========================================
   Create Top Pick
======================================== */

export async function createTopPick(
  db: D1Database,
  input: TopPickInput,
): Promise<number> {
  const result = await db
    .prepare(
      `
        INSERT INTO top_picks (
          name,
          name_japanese,
          slug,
          category,
          description,
          image_url
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `,
    )
    .bind(
      input.name.trim(),
      input.nameJapanese?.trim() || null,
      input.slug.trim(),
      input.category,
      input.description?.trim() || null,
      input.imageUrl?.trim() || null,
    )
    .run();

  return result.meta.last_row_id;
}

/* ========================================
   Update Top Pick
======================================== */

export async function updateTopPick(
  db: D1Database,
  id: number,
  input: TopPickInput,
): Promise<void> {
  await db
    .prepare(
      `
        UPDATE top_picks
        SET
          name = ?,
          name_japanese = ?,
          slug = ?,
          category = ?,
          description = ?,
          image_url = ?
        WHERE id = ?
      `,
    )
    .bind(
      input.name.trim(),
      input.nameJapanese?.trim() || null,
      input.slug.trim(),
      input.category,
      input.description?.trim() || null,
      input.imageUrl?.trim() || null,
      id,
    )
    .run();
}

/* ========================================
   Check Top Pick Assignments
======================================== */

export async function hasTopPickAssignments(
  db: D1Database,
  id: number,
): Promise<boolean> {
  const result = await db
    .prepare(
      `
        SELECT 1 AS assigned
        FROM station_top_picks
        WHERE top_pick_id = ?
        LIMIT 1
      `,
    )
    .bind(id)
    .first<{ assigned: number }>();

  return result !== null;
}

/* ========================================
   Delete Top Pick
======================================== */

export async function deleteTopPick(
  db: D1Database,
  id: number,
): Promise<void> {
  const assigned = await hasTopPickAssignments(db, id);

  if (assigned) {
    throw new Error(
      "This top pick is assigned to one or more stations. Remove those assignments before deleting it.",
    );
  }

  await db
    .prepare(
      `
        DELETE FROM top_picks
        WHERE id = ?
      `,
    )
    .bind(id)
    .run();
}

/* ========================================
   Get Top Picks Assigned to Station
======================================== */

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

/* ========================================
   Get Top Picks Not Assigned to Station
======================================== */

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