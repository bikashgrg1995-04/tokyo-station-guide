-- ONE table for everything a station says about a place (Places catalog = top_picks):
--   is_top_pick   -> website main page / map popup
--   is_thing      -> station page "Things to do"
--   is_which_exit -> station page "Which exit?"
--   is_day_trip   -> station page "Day trips"
-- station_top_picks becomes station_places; station_things, station_day_trips and the transport/help rows
-- of station_exit_places are merged into it. Hotels and restaurants stay separate.
ALTER TABLE station_top_picks RENAME TO station_places;

ALTER TABLE station_places ADD COLUMN is_top_pick INTEGER NOT NULL DEFAULT 1;
ALTER TABLE station_places ADD COLUMN top_text TEXT;
ALTER TABLE station_places ADD COLUMN top_text_japanese TEXT;
ALTER TABLE station_places ADD COLUMN top_caption TEXT;
ALTER TABLE station_places ADD COLUMN top_caption_japanese TEXT;

ALTER TABLE station_places ADD COLUMN is_thing INTEGER NOT NULL DEFAULT 0;
ALTER TABLE station_places ADD COLUMN thing_text TEXT;
ALTER TABLE station_places ADD COLUMN thing_text_japanese TEXT;
ALTER TABLE station_places ADD COLUMN thing_caption TEXT;
ALTER TABLE station_places ADD COLUMN thing_caption_japanese TEXT;

ALTER TABLE station_places ADD COLUMN is_which_exit INTEGER NOT NULL DEFAULT 0;
ALTER TABLE station_places ADD COLUMN exit_note TEXT;
ALTER TABLE station_places ADD COLUMN exit_note_japanese TEXT;

ALTER TABLE station_places ADD COLUMN is_day_trip INTEGER NOT NULL DEFAULT 0;
ALTER TABLE station_places ADD COLUMN travel_time TEXT;
ALTER TABLE station_places ADD COLUMN travel_time_japanese TEXT;
ALTER TABLE station_places ADD COLUMN transport TEXT;
ALTER TABLE station_places ADD COLUMN transport_japanese TEXT;

-- Extra exits of a "Which exit?" place (the main exit_id stays the place's own exit).
CREATE TABLE station_place_exits (
    station_id INTEGER NOT NULL,
    top_pick_id INTEGER NOT NULL,
    exit_id INTEGER NOT NULL REFERENCES station_exits(id) ON DELETE CASCADE,
    note TEXT,
    note_japanese TEXT,
    PRIMARY KEY (station_id, top_pick_id, exit_id),
    FOREIGN KEY (station_id, top_pick_id) REFERENCES station_places(station_id, top_pick_id) ON DELETE CASCADE
);
CREATE INDEX idx_station_place_exits_exit_id ON station_place_exits(exit_id);

-- 1. Things to do
INSERT INTO station_places (station_id, top_pick_id, sort_order, walking_minutes, exit_id, location, location_japanese,
                            location_type, is_top_pick, is_thing)
SELECT t.station_id, t.top_pick_id, t.sort_order, t.walking_minutes, t.exit_id, t.location, t.location_japanese,
       'outside', 0, 1
FROM station_things t WHERE true
ON CONFLICT(station_id, top_pick_id) DO UPDATE SET
    is_thing = 1,
    exit_id = COALESCE(station_places.exit_id, excluded.exit_id),
    walking_minutes = COALESCE(station_places.walking_minutes, excluded.walking_minutes),
    location = COALESCE(station_places.location, excluded.location),
    location_japanese = COALESCE(station_places.location_japanese, excluded.location_japanese);

-- Until now every thing with an exit also showed in "Which exit?": keep that.
UPDATE station_places SET is_which_exit = 1 WHERE is_thing = 1 AND exit_id IS NOT NULL;

-- 2. Day trips become Places (kind "Day trip") linked with the day-trip flag.
INSERT INTO top_picks (name, name_japanese, slug, category, kind, kind_japanese, description, description_japanese, map_url, image_url)
SELECT name, name_japanese, 'daytrip-' || id, 'daytrip', 'Day trip', '日帰り', description, description_japanese, map_url, photo
FROM station_day_trips;

INSERT INTO station_places (station_id, top_pick_id, sort_order, location_type, is_top_pick, is_day_trip,
                            travel_time, travel_time_japanese, transport, transport_japanese)
SELECT d.station_id, (SELECT p.id FROM top_picks p WHERE p.slug = 'daytrip-' || d.id), d.sort_order, 'outside', 0, 1,
       d.travel_time, d.travel_time_japanese, d.transport, d.transport_japanese
FROM station_day_trips d WHERE true;

-- 3. "Which exit?" transport / help items become Places (category transport / help).
INSERT INTO top_picks (name, name_japanese, slug, category, kind)
SELECT p.name, p.name_japanese, 'exitplace-' || p.id, p.category,
       CASE p.category WHEN 'transport' THEN 'Transport' ELSE 'Help' END
FROM station_exit_places p WHERE p.category IN ('transport', 'help');

INSERT INTO station_places (station_id, top_pick_id, sort_order, location_type, is_top_pick, is_which_exit, exit_id, exit_note, exit_note_japanese)
SELECT p.station_id, (SELECT t.id FROM top_picks t WHERE t.slug = 'exitplace-' || p.id), p.sort_order, 'outside', 0, 1,
       (SELECT x.exit_id FROM station_exit_place_exits x WHERE x.place_id = p.id ORDER BY x.exit_id LIMIT 1),
       (SELECT x.note FROM station_exit_place_exits x WHERE x.place_id = p.id ORDER BY x.exit_id LIMIT 1),
       (SELECT x.note_japanese FROM station_exit_place_exits x WHERE x.place_id = p.id ORDER BY x.exit_id LIMIT 1)
FROM station_exit_places p WHERE p.category IN ('transport', 'help') AND p.station_id IS NOT NULL;

INSERT INTO station_place_exits (station_id, top_pick_id, exit_id, note, note_japanese)
SELECT p.station_id, (SELECT t.id FROM top_picks t WHERE t.slug = 'exitplace-' || p.id), x.exit_id, x.note, x.note_japanese
FROM station_exit_places p JOIN station_exit_place_exits x ON x.place_id = p.id
WHERE p.category IN ('transport', 'help');

DROP TABLE station_things;
DROP TABLE station_day_trips;
DROP TABLE station_exit_place_exits;
DROP TABLE station_exit_places;
