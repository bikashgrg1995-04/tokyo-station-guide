-- Station page "Sides of the station": the sides of a station (e.g. Marunouchi / Yaesu)
-- plus one note about crossing between them.
CREATE TABLE station_sides (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    station_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    name_japanese TEXT,
    subtitle TEXT,
    subtitle_japanese TEXT,
    description TEXT,
    description_japanese TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE
);

CREATE INDEX idx_station_sides_station_order ON station_sides(station_id, sort_order);

ALTER TABLE stations ADD COLUMN sides_note TEXT;
ALTER TABLE stations ADD COLUMN sides_note_japanese TEXT;
