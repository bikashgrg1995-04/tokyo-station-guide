
-- ============================================================
-- Allow multiple floor entries for the same station facility
-- Preserve existing station-facility assignments and data.
-- ============================================================

CREATE TABLE station_facilities_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    station_id INTEGER NOT NULL,
    facility_id INTEGER NOT NULL,
    note TEXT,
    facility_count INTEGER
        CHECK (facility_count IS NULL OR facility_count >= 0),
    floor TEXT,

    FOREIGN KEY (station_id)
        REFERENCES stations(id)
        ON DELETE CASCADE,

    FOREIGN KEY (facility_id)
        REFERENCES facilities(id)
        ON DELETE CASCADE
);

INSERT INTO station_facilities_new (
    station_id,
    facility_id,
    note,
    facility_count,
    floor
)
SELECT
    station_id,
    facility_id,
    note,
    facility_count,
    floor
FROM station_facilities;

DROP TABLE station_facilities;

ALTER TABLE station_facilities_new
RENAME TO station_facilities;

CREATE INDEX idx_station_facilities_facility_id
    ON station_facilities(facility_id);

-- Prevent duplicate entries for the same named floor.
-- COALESCE also handles existing NULL floor values consistently.
CREATE UNIQUE INDEX idx_station_facilities_station_facility_floor
    ON station_facilities(
        station_id,
        facility_id,
        COALESCE(floor, '')
    );
