-- One table per kind of place, each linked to a station with an exit and walking minutes:
--   sights  = top_picks + station_top_picks   (used by "Which exit?", "Things to do" and the map's Top picks)
--   food    = restaurants + station_restaurants
--   hotels  = hotels + station_hotels
-- "Things to do" (station_things) and the sights / food / hotels rows of "Which exit?" (station_exit_places)
-- are moved into these tables; station_exit_places keeps only 'transport' and 'help'.

ALTER TABLE top_picks ADD COLUMN kind TEXT;
ALTER TABLE top_picks ADD COLUMN kind_japanese TEXT;

ALTER TABLE station_top_picks ADD COLUMN location TEXT;
ALTER TABLE station_top_picks ADD COLUMN location_japanese TEXT;

ALTER TABLE station_hotels ADD COLUMN exit_id INTEGER REFERENCES station_exits(id) ON DELETE SET NULL;
ALTER TABLE station_hotels ADD COLUMN walking_minutes INTEGER;
ALTER TABLE station_restaurants ADD COLUMN exit_id INTEGER REFERENCES station_exits(id) ON DELETE SET NULL;
ALTER TABLE station_restaurants ADD COLUMN walking_minutes INTEGER;

-- ---------- Things to do -> sights ----------
INSERT INTO top_picks (name, name_japanese, slug, category, description, image_url, entry_fee, map_url,
                       description_japanese, entry_fee_japanese, kind, kind_japanese)
SELECT t.name, t.name_japanese, 'thing-' || t.id, 'landmark', t.description, t.photo, t.cost, t.map_url,
       t.description_japanese, t.cost_japanese, t.kind, t.kind_japanese
FROM station_things t
WHERE NOT EXISTS (SELECT 1 FROM top_picks p WHERE lower(p.name) = lower(t.name));

INSERT OR IGNORE INTO station_top_picks
  (station_id, top_pick_id, sort_order, floor_id, exit_id, location_type, location, location_japanese)
SELECT t.station_id,
       (SELECT MIN(p.id) FROM top_picks p WHERE lower(p.name) = lower(t.name)),
       t.sort_order,
       (SELECT e.floor_id FROM station_exits e WHERE e.station_id = t.station_id AND instr(lower(t.location), lower(e.name)) > 0
         ORDER BY length(e.name) DESC LIMIT 1),
       (SELECT e.id FROM station_exits e WHERE e.station_id = t.station_id AND instr(lower(t.location), lower(e.name)) > 0
         ORDER BY length(e.name) DESC LIMIT 1),
       'outside', t.location, t.location_japanese
FROM station_things t;

ALTER TABLE station_things RENAME TO station_things_old;

-- ---------- "Which exit?" places -> sights / food / hotels ----------
INSERT INTO top_picks (name, name_japanese, slug, category)
SELECT p.name, p.name_japanese, 'place-' || p.id, 'landmark'
FROM station_exit_places p
WHERE p.category = 'sights' AND NOT EXISTS (SELECT 1 FROM top_picks t WHERE lower(t.name) = lower(p.name));

INSERT OR IGNORE INTO station_top_picks
  (station_id, top_pick_id, sort_order, floor_id, exit_id, location_type, location, location_japanese)
SELECT p.station_id,
       (SELECT MIN(t.id) FROM top_picks t WHERE lower(t.name) = lower(p.name)),
       p.sort_order,
       (SELECT e.floor_id FROM station_exit_place_exits x JOIN station_exits e ON e.id = x.exit_id WHERE x.place_id = p.id ORDER BY x.exit_id LIMIT 1),
       (SELECT x.exit_id FROM station_exit_place_exits x WHERE x.place_id = p.id ORDER BY x.exit_id LIMIT 1),
       'outside',
       (SELECT x.note FROM station_exit_place_exits x WHERE x.place_id = p.id ORDER BY x.exit_id LIMIT 1),
       (SELECT x.note_japanese FROM station_exit_place_exits x WHERE x.place_id = p.id ORDER BY x.exit_id LIMIT 1)
FROM station_exit_places p WHERE p.category = 'sights';

INSERT INTO restaurants (slug, name, name_japanese)
SELECT 'place-' || p.id, p.name, p.name_japanese
FROM station_exit_places p
WHERE p.category = 'food' AND NOT EXISTS (SELECT 1 FROM restaurants r WHERE lower(r.name) = lower(p.name));

INSERT OR IGNORE INTO station_restaurants (station_id, restaurant_id, location, location_japanese, sort_order, exit_id)
SELECT p.station_id,
       (SELECT MIN(r.id) FROM restaurants r WHERE lower(r.name) = lower(p.name)),
       (SELECT x.note FROM station_exit_place_exits x WHERE x.place_id = p.id ORDER BY x.exit_id LIMIT 1),
       (SELECT x.note_japanese FROM station_exit_place_exits x WHERE x.place_id = p.id ORDER BY x.exit_id LIMIT 1),
       p.sort_order,
       (SELECT x.exit_id FROM station_exit_place_exits x WHERE x.place_id = p.id ORDER BY x.exit_id LIMIT 1)
FROM station_exit_places p WHERE p.category = 'food';

INSERT INTO hotels (slug, name, name_japanese)
SELECT 'place-' || p.id, p.name, p.name_japanese
FROM station_exit_places p
WHERE p.category = 'hotels' AND NOT EXISTS (SELECT 1 FROM hotels h WHERE lower(h.name) = lower(p.name));

INSERT OR IGNORE INTO station_hotels (station_id, hotel_id, location, location_japanese, sort_order, exit_id)
SELECT p.station_id,
       (SELECT MIN(h.id) FROM hotels h WHERE lower(h.name) = lower(p.name)),
       (SELECT x.note FROM station_exit_place_exits x WHERE x.place_id = p.id ORDER BY x.exit_id LIMIT 1),
       (SELECT x.note_japanese FROM station_exit_place_exits x WHERE x.place_id = p.id ORDER BY x.exit_id LIMIT 1),
       p.sort_order,
       (SELECT x.exit_id FROM station_exit_place_exits x WHERE x.place_id = p.id ORDER BY x.exit_id LIMIT 1)
FROM station_exit_places p WHERE p.category = 'hotels';

DELETE FROM station_exit_places WHERE category IN ('sights', 'food', 'hotels');
