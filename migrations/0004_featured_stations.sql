CREATE TABLE featured_stations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    station_id INTEGER NOT NULL,
    image_url TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (station_id)
        REFERENCES stations(id)
        ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_featured_stations_station
    ON featured_stations(station_id);

CREATE INDEX idx_featured_stations_active_order
    ON featured_stations(is_active, sort_order);