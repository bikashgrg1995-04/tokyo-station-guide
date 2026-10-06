-- LOCAL ONLY. Wipes all content rows (tables and admin_users stay).
-- Order matters: children first, then parents.
DELETE FROM featured_stations;
DELETE FROM station_top_picks;
DELETE FROM station_facilities;
DELETE FROM top_picks;
DELETE FROM facilities;
DELETE FROM line_stations;
DELETE FROM stations;
DELETE FROM lines;
DELETE FROM operators;