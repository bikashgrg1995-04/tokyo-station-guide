-- A facility can now be inside the station, outside it, or both ('inside_outside').
-- SQLite cannot change a CHECK, so the facility table (and its exit links) is rebuilt with ids kept.
CREATE TABLE station_floor_facilities_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    floor_id INTEGER NOT NULL,
    facility_id INTEGER NOT NULL,
    note TEXT,
    facility_count INTEGER
        CHECK (facility_count IS NULL OR facility_count >= 0),
    sort_order INTEGER NOT NULL DEFAULT 0,
    location_type TEXT NOT NULL DEFAULT 'inside'
        CHECK (location_type IN ('inside', 'outside', 'inside_outside')),
    note_japanese TEXT,
    photo TEXT,
    photo_caption TEXT,
    photo_caption_japanese TEXT,
    FOREIGN KEY (floor_id) REFERENCES station_floors(id) ON DELETE CASCADE,
    FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE,
    UNIQUE (floor_id, facility_id)
);

INSERT INTO station_floor_facilities_new
  (id, floor_id, facility_id, note, facility_count, sort_order, location_type, note_japanese, photo, photo_caption, photo_caption_japanese)
SELECT id, floor_id, facility_id, note, facility_count, sort_order, location_type, note_japanese, photo, photo_caption, photo_caption_japanese
FROM station_floor_facilities;

-- Exit links are parked in a plain table first: dropping the old facility table would otherwise
-- cascade-delete them.
CREATE TABLE station_floor_facility_exits_tmp AS
SELECT id, station_floor_facility_id, station_exit_id, created_at FROM station_floor_facility_exits;

DROP TABLE station_floor_facility_exits;
DROP TABLE station_floor_facilities;
ALTER TABLE station_floor_facilities_new RENAME TO station_floor_facilities;
CREATE INDEX idx_station_floor_facilities_facility_id ON station_floor_facilities(facility_id);

CREATE TABLE station_floor_facility_exits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    station_floor_facility_id INTEGER NOT NULL,
    station_exit_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (station_floor_facility_id) REFERENCES station_floor_facilities(id) ON DELETE CASCADE,
    FOREIGN KEY (station_exit_id) REFERENCES station_exits(id) ON DELETE CASCADE,
    UNIQUE (station_floor_facility_id, station_exit_id)
);
INSERT INTO station_floor_facility_exits (id, station_floor_facility_id, station_exit_id, created_at)
SELECT id, station_floor_facility_id, station_exit_id, created_at FROM station_floor_facility_exits_tmp;
DROP TABLE station_floor_facility_exits_tmp;
