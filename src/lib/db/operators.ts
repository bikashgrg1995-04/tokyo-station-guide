export interface Operator {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  website_url: string | null;
  name_japanese: string | null;
  description_japanese: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateOperatorInput {
  name: string;
  slug: string;
  description?: string | null;
  websiteUrl?: string | null;
  nameJapanese?: string | null;
  descriptionJapanese?: string | null;
}

export interface UpdateOperatorInput {
  name: string;
  slug: string;
  description?: string | null;
  websiteUrl?: string | null;
  nameJapanese?: string | null;
  descriptionJapanese?: string | null;
}

export interface PaginatedOperators {
  items: Operator[];
  totalItems: number;
  currentPage: number;
  totalPages: number;
  perPage: number;
}


/* ========================================
   Get All Operators
======================================== */

export async function getOperators(
  db: D1Database,
): Promise<Operator[]> {
  const result = await db
    .prepare(
      `
        SELECT
          id,
          name,
          slug,
          description,
          website_url,
          name_japanese,
          description_japanese,
          created_at,
          updated_at
        FROM operators
        ORDER BY id ASC
      `,
    )
    .all<Operator>();

  return result.results;
}


/* ========================================
   Get Paginated Operators
======================================== */

export async function getOperatorsPaginated(
  db: D1Database,
  options: {
    page?: number;
    perPage?: number;
    search?: string;
  } = {},
): Promise<PaginatedOperators> {
  const perPage = Math.max(
    1,
    options.perPage ?? 10,
  );

  const requestedPage = Math.max(
    1,
    options.page ?? 1,
  );

  const search = options.search?.trim() ?? "";

  const searchValue = `%${search}%`;


  /* ========================================
     Total Count
  ======================================== */

  const countResult = await db
    .prepare(
      `
        SELECT
          COUNT(*) AS total
        FROM operators
        WHERE
          ? = ''
          OR name LIKE ?
          OR slug LIKE ?
          OR website_url LIKE ?
          OR name_japanese LIKE ?
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

  const totalItems = Number(
    countResult?.total ?? 0,
  );


  /* ========================================
     Pagination
  ======================================== */

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


  /* ========================================
     Operators
  ======================================== */

  const result = await db
    .prepare(
      `
        SELECT
          id,
          name,
          slug,
          description,
          website_url,
          name_japanese,
          description_japanese,
          created_at,
          updated_at
        FROM operators
        WHERE
          ? = ''
          OR name LIKE ?
          OR slug LIKE ?
          OR website_url LIKE ?
          OR name_japanese LIKE ?
        ORDER BY id ASC
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
    .all<Operator>();

  return {
    items: result.results,
    totalItems,
    currentPage,
    totalPages,
    perPage,
  };
}


/* ========================================
   Get Operator By ID
======================================== */

export async function getOperatorById(
  db: D1Database,
  id: number,
): Promise<Operator | null> {
  const result = await db
    .prepare(
      `
        SELECT
          id,
          name,
          slug,
          description,
          website_url,
          name_japanese,
          description_japanese,
          created_at,
          updated_at
        FROM operators
        WHERE id = ?
        LIMIT 1
      `,
    )
    .bind(id)
    .first<Operator>();

  return result ?? null;
}

/* ========================================
   Create Operator
======================================== */

export async function createOperator(
  db: D1Database,
  input: CreateOperatorInput,
): Promise<number> {
  const result = await db
    .prepare(
      `
        INSERT INTO operators (
          name,
          slug,
          description,
          website_url,
          name_japanese,
          description_japanese
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `,
    )
    .bind(
      input.name.trim(),
      input.slug.trim(),
      input.description?.trim() || null,
      input.websiteUrl?.trim() || null,
      input.nameJapanese?.trim() || null,
      input.descriptionJapanese?.trim() || null,
    )
    .run();

  return result.meta.last_row_id;
}


/* ========================================
   Update Operator
======================================== */

export async function updateOperator(
  db: D1Database,
  id: number,
  input: UpdateOperatorInput,
): Promise<void> {
  await db
    .prepare(
      `
        UPDATE operators
        SET
          name = ?,
          slug = ?,
          description = ?,
          website_url = ?,
          name_japanese = ?,
          description_japanese = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
    )
    .bind(
      input.name.trim(),
      input.slug.trim(),
      input.description?.trim() || null,
      input.websiteUrl?.trim() || null,
      input.nameJapanese?.trim() || null,
      input.descriptionJapanese?.trim() || null,
      id,
    )
    .run();
}


/* ========================================
   Delete Operator
======================================== */

export async function deleteOperator(
  db: D1Database,
  id: number,
): Promise<void> {
  await db
    .prepare(
      `
        DELETE FROM operators
        WHERE id = ?
      `,
    )
    .bind(id)
    .run();
}
