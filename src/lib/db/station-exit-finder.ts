/** "Which exit?": which exits belong to each side of the station. */

/* ---------- side <-> exit links ---------- */

export async function getSideExitIds(db: D1Database, stationId: number): Promise<Record<number, number[]>> {
  const r = await db
    .prepare(
      `SELECT se.side_id, se.exit_id
       FROM station_side_exits se JOIN station_sides s ON s.id = se.side_id
       WHERE s.station_id = ?`,
    )
    .bind(stationId)
    .all<{ side_id: number; exit_id: number }>();
  const map: Record<number, number[]> = {};
  for (const row of r.results ?? []) (map[row.side_id] ??= []).push(row.exit_id);
  return map;
}

/** Replace the exits of one side. Only exits of the same station are kept. */
export async function setSideExits(db: D1Database, stationId: number, sideId: number, exitIds: number[]) {
  const valid = await db
    .prepare(`SELECT id FROM station_exits WHERE station_id = ?`)
    .bind(stationId)
    .all<{ id: number }>();
  const ok = new Set((valid.results ?? []).map((e) => e.id));
  const ids = [...new Set(exitIds)].filter((id) => ok.has(id));
  await db.batch([
    db.prepare(`DELETE FROM station_side_exits WHERE side_id = ?`).bind(sideId),
    ...ids.map((id) =>
      db.prepare(`INSERT INTO station_side_exits (side_id, exit_id) VALUES (?, ?)`).bind(sideId, id),
    ),
  ]);
}
