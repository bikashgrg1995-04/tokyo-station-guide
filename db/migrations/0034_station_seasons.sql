-- Station page "When to visit": one row per season (spring, summer, autumn, winter).
CREATE TABLE station_seasons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    station_id INTEGER NOT NULL,
    season TEXT NOT NULL CHECK (season IN ('spring', 'summer', 'autumn', 'winter')),
    months TEXT,
    months_japanese TEXT,
    description TEXT,
    description_japanese TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE,
    UNIQUE (station_id, season)
);
