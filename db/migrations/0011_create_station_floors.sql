
-- ============================================================
-- 0011: Create relational station floors
-- Preserve existing station facility assignments.
-- ============================================================

PRAGMA foreign_keys = ON;

-- 1. Floors belong to a station.
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


-- 2. Create floor records from existing facility floor names.
-- Blank or NULL legacy floors are preserved as "Unspecified floor".
INSERT OR IGNORE INTO station_floors (
    station_id,
    name,
    floor_order
)
SELECT DISTINCT
    station_id,
    COALESCE(NULLIF(TRIM(floor), ''), 'Unspecified floor'),
    0
FROM station_facilities;


-- 3. Relational floor-facility assignments.
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


-- 4. Copy existing facility assignments into the new structure.
INSERT INTO station_floor_facilities (
    floor_id,
    facility_id,
    note,
    facility_count,
    sort_order
)
SELECT
    sfloors.id,
    sf.facility_id,
    sf.note,
    sf.facility_count,
    0
FROM station_facilities sf
JOIN station_floors sfloors
    ON sfloors.station_id = sf.station_id
   AND sfloors.name =
       COALESCE(NULLIF(TRIM(sf.floor), ''), 'Unspecified floor');


-- 5. Relational floor-top-pick assignments.
CREATE TABLE station_floor_top_picks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    floor_id INTEGER NOT NULL,
    top_pick_id INTEGER NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    walking_minutes INTEGER
        CHECK (walking_minutes IS NULL OR walking_minutes >= 0),

    FOREIGN KEY (floor_id)
        REFERENCES station_floors(id)
        ON DELETE CASCADE,

    FOREIGN KEY (top_pick_id)
        REFERENCES top_picks(id)
        ON DELETE CASCADE,

    UNIQUE (floor_id, top_pick_id)
);

CREATE INDEX idx_station_floor_top_picks_top_pick_id
    ON station_floor_top_picks(top_pick_id);


-- 6. Floor-specific station exits.
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

    FOREIGN KEY (station_id)
        REFERENCES stations(id)
        ON DELETE CASCADE,

    FOREIGN KEY (floor_id)
        REFERENCES station_floors(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_station_exits_station_floor_order
    ON station_exits(station_id, floor_id, sort_order);


-- 7. Allow existing platforms to be assigned to a floor.
-- Nullable so existing platform records remain valid.
ALTER TABLE station_platforms
ADD COLUMN floor_id INTEGER
REFERENCES station_floors(id)
ON DELETE SET NULL;

CREATE INDEX idx_station_platforms_floor_id
    ON station_platforms(floor_id);
