const COUNT_TABLES = [
  "operators",
  "lines",
  "stations",
  "facilities",
  "top_picks",
  "line_stations",
] as const;

export type DashboardCounts = Record<(typeof COUNT_TABLES)[number], number>;

export async function getDashboardCounts(
  db: D1Database,
): Promise<DashboardCounts> {
  const rows = await Promise.all(
    COUNT_TABLES.map((table) =>
      db
        .prepare(`SELECT COUNT(*) AS count FROM ${table}`)
        .first<{ count: number }>(),
    ),
  );

  return Object.fromEntries(
    COUNT_TABLES.map((table, i) => [table, rows[i]?.count ?? 0]),
  ) as DashboardCounts;
}
