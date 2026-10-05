-- Wipes all rows (tables stay) so db/seed.sql can load a clean copy.
-- Order matters: children first, then parents.
DELETE FROM featured_stations;
DELETE FROM line_stations;
DELETE FROM stations;
DELETE FROM lines;
DELETE FROM operators;