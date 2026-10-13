/* ========================================
   Lines Database Helpers
======================================== */

export interface Line {
  id: number;
  operator_id: number;
  operator_name: string;
  name: string;
  slug: string;
  code: string | null;
  description: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateLineInput {
  operatorId: number;
  name: string;
  slug: string;
  code?: string | null;
  description?: string | null;
  color?: string | null;
}

export interface UpdateLineInput {
  operatorId: number;
  name: string;
  slug: string;
  code?: string | null;
  description?: string | null;
  color?: string | null;
}

export interface PaginatedLines {
  items: Line[];
  totalItems: number;
  currentPage: number;
  totalPages: number;
  perPage: number;
}


/* ========================================
   Get All Lines
======================================== */

export async function getLines(
  db: D1Database,
): Promise<Line[]> {
  const result = await db
    .prepare(
      `
        SELECT
          l.id,
          l.operator_id,
          o.name AS operator_name,
          l.name,
          l.slug,
          l.code,
          l.description,
          l.color,
          l.created_at,
          l.updated_at
        FROM lines l
        INNER JOIN operators o
          ON o.id = l.operator_id
        ORDER BY l.name ASC
      `,
    )
    .all<Line>();

  return result.results;
}


/* ========================================
   Get Paginated Lines
======================================== */

export async function getLinesPaginated(
  db: D1Database,
  options: {
    page?: number;
    perPage?: number;
    search?: string;
  } = {},
): Promise<PaginatedLines> {
  const perPage = Math.max(
    1,
    options.perPage ?? 10,
  );

  const requestedPage = Math.max(
    1,
    options.page ?? 1,
  );

  const search =
    options.search?.trim() ?? "";

  const searchValue = `%${search}%`;


  /* ======================================
     Count
  ====================================== */

  const countResult = await db
    .prepare(
      `
        SELECT COUNT(*) AS total
        FROM lines l
        INNER JOIN operators o
          ON o.id = l.operator_id
        WHERE
          ? = ''
          OR l.name LIKE ?
          OR l.slug LIKE ?
          OR l.code LIKE ?
          OR o.name LIKE ?
      `,
    )
    .bind(
      search,
      searchValue,
      searchValue,
      searchValue,
      searchValue,
    )
    .first<{ total: number }>();

  const totalItems =
    Number(countResult?.total ?? 0);

  const totalPages = Math.max(
    1,
    Math.ceil(totalItems / perPage),
  );

  const currentPage = Math.min(
    requestedPage,
    totalPages,
  );

  const offset =
    (currentPage - 1) * perPage;


  /* ======================================
     Rows
  ====================================== */

  const result = await db
    .prepare(
      `
        SELECT
          l.id,
          l.operator_id,
          o.name AS operator_name,
          l.name,
          l.slug,
          l.code,
          l.description,
          l.color,
          l.created_at,
          l.updated_at
        FROM lines l
        INNER JOIN operators o
          ON o.id = l.operator_id
        WHERE
          ? = ''
          OR l.name LIKE ?
          OR l.slug LIKE ?
          OR l.code LIKE ?
          OR o.name LIKE ?
        ORDER BY l.name ASC
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
    .all<Line>();

  return {
    items: result.results,
    totalItems,
    currentPage,
    totalPages,
    perPage,
  };
}


/* ========================================
   Get Line By ID
======================================== */

export async function getLineById(
  db: D1Database,
  id: number,
): Promise<Line | null> {
  const result = await db
    .prepare(
      `
        SELECT
          l.id,
          l.operator_id,
          o.name AS operator_name,
          l.name,
          l.slug,
          l.code,
          l.description,
          l.color,
          l.created_at,
          l.updated_at
        FROM lines l
        INNER JOIN operators o
          ON o.id = l.operator_id
        WHERE l.id = ?
        LIMIT 1
      `,
    )
    .bind(id)
    .first<Line>();

  return result ?? null;
}

/* ========================================
   Create Line
======================================== */

export async function createLine(
  db: D1Database,
  input: CreateLineInput,
): Promise<number> {
  const result = await db
    .prepare(
      `
        INSERT INTO lines (
          operator_id,
          name,
          slug,
          code,
          description,
          color
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `,
    )
    .bind(
      input.operatorId,
      input.name.trim(),
      input.slug.trim(),
      input.code?.trim() || null,
      input.description?.trim() || null,
      input.color?.trim() || null,
    )
    .run();

  return result.meta.last_row_id;
}


/* ========================================
   Update Line
======================================== */

export async function updateLine(
  db: D1Database,
  id: number,
  input: UpdateLineInput,
): Promise<void> {
  await db
    .prepare(
      `
        UPDATE lines
        SET
          operator_id = ?,
          name = ?,
          slug = ?,
          code = ?,
          description = ?,
          color = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
    )
    .bind(
      input.operatorId,
      input.name.trim(),
      input.slug.trim(),
      input.code?.trim() || null,
      input.description?.trim() || null,
      input.color?.trim() || null,
      id,
    )
    .run();
}


/* ========================================
   Delete Line
======================================== */

export async function deleteLine(
  db: D1Database,
  id: number,
): Promise<void> {
  await db
    .prepare(
      `
        DELETE FROM lines
        WHERE id = ?
      `,
    )
    .bind(id)
    .run();
}
