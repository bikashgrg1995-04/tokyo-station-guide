-- ============================================================
-- 0001: Full schema (squashed baseline)
--
-- This file is the final state of the former migrations 0001-0015.
-- Databases that already ran the old 0001 skip this file (wrangler
-- tracks migrations by file name), so DO NOT RENAME IT. They pick
-- up the remaining changes from 0014_cleanup_legacy_schema.sql.
-- New databases get everything from here.
--
-- Column order matches what the old migration chain produced
-- (columns added later come last), so both paths give an identical schema.
-- See db/SCHEMA.md for what each table is for.
-- ============================================================

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
--              (not read by the app yet, see db/SCHEMA.md)
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
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_verified INTEGER NOT NULL DEFAULT 0
        CHECK (is_verified IN (0, 1)),
    verified_at TEXT
);

CREATE INDEX idx_stations_name
    ON stations(name);

-- ============================================================
-- Line <-> Station relationship
-- (UNIQUE (line_id, station_id) already serves line_id lookups)
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

CREATE INDEX idx_line_stations_station_id
    ON line_stations(station_id);

-- ============================================================
-- Facilities (shared list)
--
-- icon / icon_dark: R2 object keys (facility-icons/...).
-- When icon_dark is empty the website uses icon in dark mode too.
-- ============================================================

CREATE TABLE facilities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    icon TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    icon_dark TEXT
);

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

-- ============================================================
-- Admin accounts and login throttling
-- (UNIQUE (email) already serves email lookups)
-- ============================================================

CREATE TABLE admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Failed admin login attempts, used to throttle brute-force guessing.
CREATE TABLE login_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    ip TEXT NOT NULL,
    attempted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_login_attempts_email
    ON login_attempts(email, attempted_at);

CREATE INDEX idx_login_attempts_ip
    ON login_attempts(ip, attempted_at);

-- ============================================================
-- Station suggestions (public edit proposals, reviewed by an admin)
--
-- suggested_lines / _platforms / _facilities / _top_picks hold JSON
-- arrays as TEXT. Live station data stays unchanged until approval.
-- ============================================================

CREATE TABLE station_suggestions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    station_id INTEGER NOT NULL,

    suggested_name TEXT,
    suggested_name_japanese TEXT,
    suggested_description TEXT,
    suggested_about TEXT,
    suggested_latitude REAL,
    suggested_longitude REAL,

    reason TEXT,
    submitter_name TEXT,
    submitter_email TEXT,

    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),

    reviewed_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    suggested_lines TEXT,
    suggested_platforms TEXT,
    suggested_facilities TEXT,
    suggested_top_picks TEXT,

    FOREIGN KEY (station_id)
        REFERENCES stations(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_station_suggestions_status_created
    ON station_suggestions(status, created_at);

CREATE INDEX idx_station_suggestions_station_id
    ON station_suggestions(station_id);

-- ============================================================
-- Station floors
-- ============================================================

CREATE TABLE station_floors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    station_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    name_japanese TEXT,
    floor_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (station_id)
        REFERENCES stations(id)
        ON DELETE CASCADE,

    UNIQUE (station_id, name)
);

CREATE INDEX idx_station_floors_station_order
    ON station_floors(station_id, floor_order);

-- Which facility is on which floor (count, note, order).
CREATE TABLE station_floor_facilities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    floor_id INTEGER NOT NULL,
    facility_id INTEGER NOT NULL,
    note TEXT,
    facility_count INTEGER
        CHECK (facility_count IS NULL OR facility_count >= 0),
    sort_order INTEGER NOT NULL DEFAULT 0,

    FOREIGN KEY (floor_id)
        REFERENCES station_floors(id)
        ON DELETE CASCADE,

    FOREIGN KEY (facility_id)
        REFERENCES facilities(id)
        ON DELETE CASCADE,

    UNIQUE (floor_id, facility_id)
);

CREATE INDEX idx_station_floor_facilities_facility_id
    ON station_floor_facilities(facility_id);

-- Floor-specific station exits.
CREATE TABLE station_exits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    station_id INTEGER NOT NULL,
    floor_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    code TEXT,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    color_code TEXT,

    FOREIGN KEY (station_id)
        REFERENCES stations(id)
        ON DELETE CASCADE,

    FOREIGN KEY (floor_id)
        REFERENCES station_floors(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_station_exits_station_floor_order
    ON station_exits(station_id, floor_id, sort_order);

-- Deleting a floor cascades to its exits by floor_id.
CREATE INDEX idx_station_exits_floor_id
    ON station_exits(floor_id);

-- Which exits a floor facility is reached from.
CREATE TABLE station_floor_facility_exits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    station_floor_facility_id INTEGER NOT NULL,
    station_exit_id INTEGER NOT NULL,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (station_floor_facility_id)
        REFERENCES station_floor_facilities(id)
        ON DELETE CASCADE,

    FOREIGN KEY (station_exit_id)
        REFERENCES station_exits(id)
        ON DELETE CASCADE,

    UNIQUE (station_floor_facility_id, station_exit_id)
);

CREATE INDEX idx_station_floor_facility_exits_assignment
    ON station_floor_facility_exits(station_floor_facility_id);

CREATE INDEX idx_station_floor_facility_exits_exit
    ON station_floor_facility_exits(station_exit_id);

-- ============================================================
-- Physical station platforms
-- line_id and floor_id are optional.
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
    destinations TEXT,
    floor_id INTEGER
        REFERENCES station_floors(id)
        ON DELETE SET NULL,

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

CREATE INDEX idx_station_platforms_floor_id
    ON station_platforms(floor_id);
