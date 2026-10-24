-- Station page "Exits & station tips": exit photos with captions, a bullet list of tips,
-- and a footnote under the exits table. (The exits table itself uses station_exits.)
CREATE TABLE station_exit_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    station_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    title_japanese TEXT,
    caption TEXT,
    caption_japanese TEXT,
    image TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE
);
CREATE INDEX idx_station_exit_photos_station_order ON station_exit_photos(station_id, sort_order);

CREATE TABLE station_tips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    station_id INTEGER NOT NULL,
    tip TEXT NOT NULL,
    tip_japanese TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE
);
CREATE INDEX idx_station_tips_station_order ON station_tips(station_id, sort_order);

ALTER TABLE stations ADD COLUMN exits_note TEXT;
ALTER TABLE stations ADD COLUMN exits_note_japanese TEXT;
