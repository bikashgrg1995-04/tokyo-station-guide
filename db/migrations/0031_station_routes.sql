-- Station page "Getting there": how to reach the station from places such as airports.
CREATE TABLE station_routes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    station_id INTEGER NOT NULL,
    from_place TEXT NOT NULL,
    from_place_japanese TEXT,
    route TEXT,
    route_japanese TEXT,
    travel_time TEXT,
    travel_time_japanese TEXT,
    cost TEXT,
    cost_japanese TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE
);

CREATE INDEX idx_station_routes_station_order ON station_routes(station_id, sort_order);

-- Footnote under the table (fares / dates).
ALTER TABLE stations ADD COLUMN routes_note TEXT;
ALTER TABLE stations ADD COLUMN routes_note_japanese TEXT;
