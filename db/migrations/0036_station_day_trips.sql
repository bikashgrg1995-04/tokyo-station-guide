-- Station page "Day trips": places reachable from the station, each with a photo.
CREATE TABLE station_day_trips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    station_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    name_japanese TEXT,
    travel_time TEXT,
    travel_time_japanese TEXT,
    transport TEXT,
    transport_japanese TEXT,
    description TEXT,
    description_japanese TEXT,
    map_url TEXT,
    photo TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE
);
CREATE INDEX idx_station_day_trips_order ON station_day_trips(station_id, sort_order);
