-- Two lists that both pick from the Places catalog (top_picks), each with its own station-level fields:
--   station_top_picks = "Top picks": the website main page / map popup
--   station_things    = "Things to do": the station page (and "Which exit?")
CREATE TABLE station_things (
    station_id INTEGER NOT NULL,
    top_pick_id INTEGER NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    exit_id INTEGER REFERENCES station_exits(id) ON DELETE SET NULL,
    walking_minutes INTEGER,
    location TEXT,
    location_japanese TEXT,
    PRIMARY KEY (station_id, top_pick_id),
    FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE,
    FOREIGN KEY (top_pick_id) REFERENCES top_picks(id) ON DELETE CASCADE
);
CREATE INDEX idx_station_things_top_pick_id ON station_things(top_pick_id);

-- Places that migration 0045 created from old "Things to do" / "Which exit?" sights move to the new list.
INSERT OR IGNORE INTO station_things (station_id, top_pick_id, sort_order, exit_id, walking_minutes, location, location_japanese)
SELECT stp.station_id, stp.top_pick_id, stp.sort_order, stp.exit_id, stp.walking_minutes, stp.location, stp.location_japanese
FROM station_top_picks stp JOIN top_picks p ON p.id = stp.top_pick_id
WHERE p.slug LIKE 'thing-%' OR p.slug LIKE 'place-%';

-- Old things that matched a place that already existed.
INSERT OR IGNORE INTO station_things (station_id, top_pick_id, sort_order, exit_id, location, location_japanese)
SELECT o.station_id,
       (SELECT MIN(p.id) FROM top_picks p WHERE lower(p.name) = lower(o.name)),
       o.sort_order,
       (SELECT e.id FROM station_exits e WHERE e.station_id = o.station_id AND instr(lower(o.location), lower(e.name)) > 0
         ORDER BY length(e.name) DESC LIMIT 1),
       o.location, o.location_japanese
FROM station_things_old o
WHERE EXISTS (SELECT 1 FROM top_picks p WHERE lower(p.name) = lower(o.name));

-- They no longer count as map Top picks.
DELETE FROM station_top_picks
WHERE top_pick_id IN (SELECT id FROM top_picks WHERE slug LIKE 'thing-%' OR slug LIKE 'place-%');
