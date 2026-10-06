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
--
-- line_type:   jr | subway | private | shinkansen | express
-- show_on_map: 1 = drawn on the map and listed in the Lines dialog
--              0 = only shown as a connection on station popups
-- ============================================================

CREATE TABLE lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    operator_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    code TEXT,
    description TEXT,
    color TEXT,
    line_type TEXT NOT NULL DEFAULT 'subway'
        CHECK (line_type IN ('jr', 'subway', 'private', 'shinkansen', 'express')),
    show_on_map INTEGER NOT NULL DEFAULT 1
        CHECK (show_on_map IN (0, 1)),
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
--
-- description: short text for the landing page card
-- about:       text shown in the station popup
-- ============================================================

CREATE TABLE stations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    name_japanese TEXT,
    slug TEXT NOT NULL UNIQUE,
    latitude REAL,
    longitude REAL,
    description TEXT,
    about TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stations_name
    ON stations(name);

-- ============================================================
-- Line <-> Station relationship
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

-- ============================================================
-- Facilities (shared list) + which station has which
-- ============================================================

CREATE TABLE facilities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    icon TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE station_facilities (
    station_id INTEGER NOT NULL,
    facility_id INTEGER NOT NULL,
    note TEXT,

    PRIMARY KEY (station_id, facility_id),

    FOREIGN KEY (station_id)
        REFERENCES stations(id)
        ON DELETE CASCADE,

    FOREIGN KEY (facility_id)
        REFERENCES facilities(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_station_facilities_facility_id
    ON station_facilities(facility_id);

-- ============================================================
-- Top picks (shared list) + which station recommends which
--
-- category: landmark | food | shopping | museum | park | temple
-- ============================================================

CREATE TABLE top_picks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    name_japanese TEXT,
    slug TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL DEFAULT 'landmark',
    description TEXT,
    image_url TEXT
);

CREATE TABLE station_top_picks (
    station_id INTEGER NOT NULL,
    top_pick_id INTEGER NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    walking_minutes INTEGER,

    PRIMARY KEY (station_id, top_pick_id),

    FOREIGN KEY (station_id)
        REFERENCES stations(id)
        ON DELETE CASCADE,

    FOREIGN KEY (top_pick_id)
        REFERENCES top_picks(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_station_top_picks_top_pick_id
    ON station_top_picks(top_pick_id);

-- ============================================================
-- Featured stations (landing page "Popular Station Hubs")
-- ============================================================

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