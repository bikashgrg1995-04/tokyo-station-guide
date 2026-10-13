-- ============================================================
-- 0015: Drop the legacy station_facilities table
--
-- Migration 0011 copied every row into station_floors +
-- station_floor_facilities, and the app has read and written only
-- those tables since. The old table is a stale snapshot.
--
-- BEFORE APPLYING (production):
--   1. Back up the D1 database.
--   2. Deploy the code from this change first. Older code still runs
--      "DELETE FROM station_facilities" when a station is deleted.
--   3. Optional sanity check, the second number should not be smaller:
--        SELECT COUNT(*) FROM station_facilities;
--        SELECT COUNT(*) FROM station_floor_facilities;
-- ============================================================

DROP TABLE IF EXISTS station_facilities;
