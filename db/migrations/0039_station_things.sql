-- Station page "Things to do": places near the station, each with a photo.
-- The grey line under the name is: kind · location · cost.
CREATE TABLE station_things (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    station_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    name_japanese TEXT,
    kind TEXT,
    kind_japanese TEXT,
    location TEXT,
    location_japanese TEXT,
    cost TEXT,
    cost_japanese TEXT,
    description TEXT,
    description_japanese TEXT,
    map_url TEXT,
    photo TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE
);
CREATE INDEX idx_station_things_order ON station_things(station_id, sort_order);
