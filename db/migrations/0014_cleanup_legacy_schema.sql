-- ============================================================
-- 0014: Bring databases created before the squash up to date
--
-- Only does something on databases that ran the old migrations
-- 0001-0013. A new database already has this state from 0001, so
-- every statement here is a no-op there. Once every database
-- (local, client, production) has applied it, this file can be deleted.
--
-- BEFORE APPLYING (production):
--   1. Back up the D1 database.
--   2. Deploy the code from this change first. Older code still runs
--      "DELETE FROM station_facilities" when a station is deleted.
--   3. Optional sanity check, the second number should not be smaller:
--        SELECT COUNT(*) FROM station_facilities;
--        SELECT COUNT(*) FROM station_floor_facilities;
-- ============================================================

-- Created in 0011 but never read or written by the app.
DROP TABLE IF EXISTS station_floor_top_picks;

-- Legacy table. 0011 copied every row into station_floors +
-- station_floor_facilities, and the app has used only those since.
DROP TABLE IF EXISTS station_facilities;

-- Redundant: already served by UNIQUE (email) and
-- UNIQUE (line_id, station_id).
DROP INDEX IF EXISTS idx_admin_users_email;
DROP INDEX IF EXISTS idx_line_stations_line_id;

-- Missing: floor deletes cascade to station_exits by floor_id.
CREATE INDEX IF NOT EXISTS idx_station_exits_floor_id
    ON station_exits(floor_id);
