
PRAGMA foreign_keys = ON;

-- ============================================================
-- Physical station platforms
-- ============================================================

CREATE TABLE station_platforms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    station_id INTEGER NOT NULL,
    line_id INTEGER,
    platform_number TEXT NOT NULL,
    notes TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (station_id)
        REFERENCES stations(id)
        ON DELETE CASCADE,

    FOREIGN KEY (line_id)
        REFERENCES lines(id)
        ON DELETE SET NULL
);

CREATE INDEX idx_station_platforms_station_order
    ON station_platforms(station_id, sort_order);

CREATE INDEX idx_station_platforms_line_id
    ON station_platforms(line_id);


-- ============================================================
-- Additional proposed data for station suggestions
-- Store JSON arrays as TEXT.
-- Existing live station data remains unchanged until approval.
-- ============================================================

ALTER TABLE station_suggestions
ADD COLUMN suggested_lines TEXT;

ALTER TABLE station_suggestions
ADD COLUMN suggested_platforms TEXT;

ALTER TABLE station_suggestions
ADD COLUMN suggested_facilities TEXT;

ALTER TABLE station_suggestions
ADD COLUMN suggested_top_picks TEXT;
