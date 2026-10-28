-- LOCAL ONLY. Wipes all content rows (tables and admin_users stay).
-- Order matters: children first, then parents.
-- (Foreign keys would cascade most of this, but listing every table keeps the
--  script correct even if foreign_keys is off.)
DELETE FROM station_floor_facility_exits;
DELETE FROM station_exits;
DELETE FROM station_floor_facilities;
DELETE FROM station_platforms;
DELETE FROM station_floors;
DELETE FROM station_suggestions;
DELETE FROM featured_stations;
DELETE FROM station_places;
DELETE FROM top_picks;
DELETE FROM facilities;
DELETE FROM line_stations;
DELETE FROM stations;
DELETE FROM lines;
DELETE FROM operators;
DELETE FROM login_attempts;
