-- Wipes all content rows EXCEPT facilities (names + icons) and admin_users.
-- Run against local with --local, or the live database with --remote.
-- Back up first: wrangler d1 export tokyo-station-guide-db --remote --output=backup.sql
-- Order matters: children first, then parents.
DELETE FROM station_floor_facility_exits;
DELETE FROM station_exits;
DELETE FROM station_floor_facilities;
DELETE FROM station_platforms;
DELETE FROM station_floors;
DELETE FROM station_suggestions;
DELETE FROM featured_stations;
DELETE FROM station_places;
DELETE FROM top_picks;
DELETE FROM line_stations;
DELETE FROM stations;
DELETE FROM lines;
DELETE FROM operators;
DELETE FROM login_attempts;

-- Make the cached public pages rebuild straight away.
INSERT INTO site_meta (key, value) VALUES ('content_version', strftime('%s','now') || '000')
ON CONFLICT(key) DO UPDATE SET value = excluded.value;
