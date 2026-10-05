-- Featured ("Popular Station Hubs") seed data.
-- Run AFTER db/seed.sql.
--
-- ASSUMED table shape (check with: PRAGMA table_info(featured_stations);):
--   featured_stations(station_id, image_url, description, sort_order)
-- If your column names differ (e.g. display_order, is_active), rename them below.
--
-- Images: put files in public/images/featured/<slug>.jpg
-- (or replace image_url with full https URLs).

DELETE FROM featured_stations;

WITH f(slug, image_url, description, sort_order) AS (VALUES
  ('tokyo',      '/images/featured/tokyo.jpg',      'Shinkansen hub with the historic red-brick Marunouchi building.', 1),
  ('shinjuku',   '/images/featured/shinjuku.jpg',   'The world''s busiest station, from skyscrapers to Kabukicho.',    2),
  ('shibuya',    '/images/featured/shibuya.jpg',    'Scramble crossing, Hachiko, and Tokyo youth culture.',            3),
  ('ikebukuro',  '/images/featured/ikebukuro.jpg',  'Big shopping hub with Sunshine City and Otome Road.',             4),
  ('ueno',       '/images/featured/ueno.jpg',       'Museums, zoo, and Ameyoko beside Ueno Park.',                     5),
  ('akihabara',  '/images/featured/akihabara.jpg',  'Electric Town: anime, games, and electronics.',                   6),
  ('shinagawa',  '/images/featured/shinagawa.jpg',  'Shinkansen and Haneda Airport gateway.',                          7),
  ('asakusa',    '/images/featured/asakusa.jpg',    'Senso-ji Temple and the old town of Tokyo.',                      8)
)
INSERT INTO featured_stations (station_id, image_url, description, sort_order)
SELECT s.id, f.image_url, f.description, f.sort_order
FROM f
JOIN stations s ON s.slug = f.slug;