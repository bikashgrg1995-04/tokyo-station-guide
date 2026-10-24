-- Station page "Buses & taxis": a table (where / service / notes) plus photo cards.
-- A row with a service or notes is listed in the table; a row with a photo also gets a photo card.
CREATE TABLE station_transport (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    station_id INTEGER NOT NULL,
    place TEXT NOT NULL,
    place_japanese TEXT,
    service TEXT,
    service_japanese TEXT,
    notes TEXT,
    notes_japanese TEXT,
    photo TEXT,
    photo_title TEXT,
    photo_title_japanese TEXT,
    photo_caption TEXT,
    photo_caption_japanese TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE
);
CREATE INDEX idx_station_transport_order ON station_transport(station_id, sort_order);
