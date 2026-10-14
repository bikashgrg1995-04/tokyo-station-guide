
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

export type TopPickLocationType = "inside" | "connected" | "outside";

export interface TopPickOpeningHour {
  id?: number;
  day_of_week: number; // 0 = Sunday, 6 = Saturday
  is_closed: boolean;
  opening_time: string | null;
  closing_time: string | null;
  last_entry_time: string | null;
}

export interface TopPick {
  id: number;
  name: string;
  name_japanese: string | null;
  slug: string;
  category: string;
  description: string | null;
  image_url: string | null;
  entry_fee: string | null;
  notes: string | null;
  opening_hours?: TopPickOpeningHour[];
}

export interface StationTopPick {
  id: number;
  name: string;
  name_japanese: string | null;
  slug: string;
  category: string;
  description: string | null;
  image_url: string | null;
  entry_fee: string | null;
  notes: string | null;
  sort_order: number;
  walking_minutes: number | null;
  floor_id: number | null;
  floor_name: string | null;
  floor_name_japanese: string | null;
  exit_id: number | null;
  exit_name: string | null;
  exit_code: string | null;
  location_type: TopPickLocationType;
}

export interface TopPickInput {
  name: string;
  nameJapanese?: string | null;
  slug: string;
  category: TopPickCategory;
  description?: string | null;
  imageUrl?: string | null;
  entryFee?: string | null;
  notes?: string | null;
  openingHours?: TopPickOpeningHour[];
}

export interface PaginatedTopPicks {
  items: TopPick[];
  totalItems: number;
  currentPage: number;
  totalPages: number;
  perPage: number;
}

/* ========================================
   Shared Opening Hours Helpers
======================================== */

async function getTopPickOpeningHours(
  db: D1Database,
  topPickId: number,
): Promise<TopPickOpeningHour[]> {
  const result = await db
    .prepare(
      `
        SELECT
          id,
          day_of_week,
          is_closed,
          opening_time,
          closing_time,
          last_entry_time
        FROM top_pick_opening_hours
        WHERE top_pick_id = ?
        ORDER BY day_of_week ASC
      `,
    )
    .bind(topPickId)
    .all<TopPickOpeningHour>();

  return result.results.map((hour) => ({
    ...hour,
    is_closed: Boolean(hour.is_closed),
  }));
}

async function replaceTopPickOpeningHours(
  db: D1Database,
  topPickId: number,
  openingHours: TopPickOpeningHour[],
): Promise<void> {
  // Validate weekdays and reject duplicate days before changing data.
  const seenDays = new Set<number>();

  for (const hour of openingHours) {
    if (
      !Number.isInteger(hour.day_of_week) ||
      hour.day_of_week < 0 ||
      hour.day_of_week > 6
    ) {
      throw new Error("Opening hours contain an invalid day of the week.");
    }

    if (seenDays.has(hour.day_of_week)) {
      throw new Error("Opening hours contain a duplicate day.");
    }

    seenDays.add(hour.day_of_week);

    if (
      !hour.is_closed &&
      (!hour.opening_time ||
        !hour.closing_time ||
        !/^\d{2}:\d{2}$/.test(hour.opening_time) ||
        !/^\d{2}:\d{2}$/.test(hour.closing_time))
    ) {
      throw new Error("Valid opening and closing times are required.");
    }

    if (
      hour.last_entry_time &&
      !/^\d{2}:\d{2}$/.test(hour.last_entry_time)
    ) {
      throw new Error("Last entry time must use HH:MM format.");
    }
  }

  // Use a D1 batch so deletion and inserts execute together.
  const statements: D1PreparedStatement[] = [
    db
      .prepare(
        `DELETE FROM top_pick_opening_hours WHERE top_pick_id = ?`,
      )
      .bind(topPickId),
    ...openingHours.map((hour) =>
      db
        .prepare(
          `
            INSERT INTO top_pick_opening_hours (
              top_pick_id,
              day_of_week,
              is_closed,
              opening_time,
              closing_time,
              last_entry_time
            )
            VALUES (?, ?, ?, ?, ?, ?)
          `,
        )
        .bind(
          topPickId,
          hour.day_of_week,
          hour.is_closed ? 1 : 0,
          hour.is_closed ? null : hour.opening_time,
          hour.is_closed ? null : hour.closing_time,
          hour.last_entry_time || null,
        ),
    ),
  ];

  await db.batch(statements);
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
          image_url,
          entry_fee,
          notes
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
          OR entry_fee LIKE ?
          OR notes LIKE ?
      `,
    )
    .bind(
      search,
      searchValue,
      searchValue,
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
          image_url,
          entry_fee,
          notes
        FROM top_picks
        WHERE
          ? = ''
          OR name LIKE ?
          OR name_japanese LIKE ?
          OR slug LIKE ?
          OR category LIKE ?
          OR description LIKE ?
          OR entry_fee LIKE ?
          OR notes LIKE ?
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
          image_url,
          entry_fee,
          notes
        FROM top_picks
        WHERE id = ?
        LIMIT 1
      `,
    )
    .bind(id)
    .first<TopPick>();

  if (!result) {
    return null;
  }

  const openingHours = await getTopPickOpeningHours(db, id);

  return {
    ...result,
    opening_hours: openingHours,
  };
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
          image_url,
          entry_fee,
          notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
    )
    .bind(
      input.name.trim(),
      input.nameJapanese?.trim() || null,
      input.slug.trim(),
      input.category,
      input.description?.trim() || null,
      input.imageUrl?.trim() || null,
      input.entryFee?.trim() || null,
      input.notes?.trim() || null,
    )
    .run();

  const topPickId = Number(result.meta.last_row_id);

  if (input.openingHours !== undefined) {
    await replaceTopPickOpeningHours(
      db,
      topPickId,
      input.openingHours,
    );
  }

  return topPickId;
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
          image_url = ?,
          entry_fee = ?,
          notes = ?
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
      input.entryFee?.trim() || null,
      input.notes?.trim() || null,
      id,
    )
    .run();

  if (input.openingHours !== undefined) {
    await replaceTopPickOpeningHours(
      db,
      id,
      input.openingHours,
    );
  }
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
          tp.entry_fee,
          tp.notes,
          stp.sort_order,
          stp.walking_minutes,
          stp.floor_id,
          sf.name AS floor_name,
          sf.name_japanese AS floor_name_japanese,
          stp.exit_id,
          se.name AS exit_name,
          se.code AS exit_code,
          stp.location_type
        FROM station_top_picks stp
        INNER JOIN top_picks tp
          ON tp.id = stp.top_pick_id
        LEFT JOIN station_floors sf
          ON sf.id = stp.floor_id
        LEFT JOIN station_exits se
          ON se.id = stp.exit_id
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
          tp.image_url,
          tp.entry_fee,
          tp.notes
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
