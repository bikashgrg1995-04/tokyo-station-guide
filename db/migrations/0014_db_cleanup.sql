-- ============================================================
-- 0014: Schema cleanup (safe, no live data is touched)
-- ============================================================

-- 1. station_floor_top_picks was created in 0011 but nothing in the app
--    ever reads or writes it. Top picks live in station_top_picks.
--    Its index is dropped together with the table.
DROP TABLE IF EXISTS station_floor_top_picks;

-- 2. Redundant indexes. Each one is already served by a UNIQUE
--    constraint that starts with the same column, so they only
--    slow down writes.
--    admin_users.email      -> UNIQUE (email)
--    line_stations.line_id  -> UNIQUE (line_id, station_id)
DROP INDEX IF EXISTS idx_admin_users_email;
DROP INDEX IF EXISTS idx_line_stations_line_id;

-- 3. Missing index. Deleting a floor cascades to station_exits by
--    floor_id, but the existing index starts with station_id, so the
--    cascade (and any "exits on this floor" lookup) scanned the table.
CREATE INDEX IF NOT EXISTS idx_station_exits_floor_id
    ON station_exits(floor_id);
