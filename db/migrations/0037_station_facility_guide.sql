-- Station page "Facilities": a table of facilities with what to know, plus photo cards.
-- A row with a description is listed in the table; a row with a photo also gets a photo card.
CREATE TABLE station_facility_guide (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    station_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    name_japanese TEXT,
    description TEXT,
    description_japanese TEXT,
    photo TEXT,
    photo_caption TEXT,
    photo_caption_japanese TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE
);
CREATE INDEX idx_station_facility_guide_order ON station_facility_guide(station_id, sort_order);
