PRAGMA foreign_keys = ON;

-- ============================================================
-- Operators
-- ============================================================

CREATE TABLE operators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    website_url TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Lines
-- ============================================================

CREATE TABLE lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    operator_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    code TEXT,
    description TEXT,
    color TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (operator_id)
        REFERENCES operators(id)
        ON DELETE RESTRICT
);

CREATE INDEX idx_lines_operator_id
    ON lines(operator_id);

-- ============================================================
-- Stations
-- ============================================================

CREATE TABLE stations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    name_japanese TEXT,
    slug TEXT NOT NULL UNIQUE,
    latitude REAL,
    longitude REAL,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stations_name
    ON stations(name);

-- ============================================================
-- Line ↔ Station relationship
-- ============================================================

CREATE TABLE line_stations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    line_id INTEGER NOT NULL,
    station_id INTEGER NOT NULL,
    station_order INTEGER NOT NULL,
    station_code TEXT,

    FOREIGN KEY (line_id)
        REFERENCES lines(id)
        ON DELETE CASCADE,

    FOREIGN KEY (station_id)
        REFERENCES stations(id)
        ON DELETE CASCADE,

    UNIQUE (line_id, station_id),
    UNIQUE (line_id, station_order)
);

CREATE INDEX idx_line_stations_line_id
    ON line_stations(line_id);

CREATE INDEX idx_line_stations_station_id
    ON line_stations(station_id);