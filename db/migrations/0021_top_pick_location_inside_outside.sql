
-- ============================================================
-- 0021: Top Pick station location types
--
-- Replaces 'connected' with 'inside_outside', so the allowed values
-- become: inside, outside, inside_outside.
--
-- SQLite cannot change a CHECK constraint in place, so the table
-- is rebuilt. Existing 'connected' rows become 'inside_outside'.
-- ============================================================

CREATE TABLE station_top_picks_new (
    station_id INTEGER NOT NULL,
    top_pick_id INTEGER NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    walking_minutes INTEGER,
    floor_id INTEGER
        REFERENCES station_floors(id) ON DELETE SET NULL,
    exit_id INTEGER
        REFERENCES station_exits(id) ON DELETE SET NULL,
    location_type TEXT NOT NULL DEFAULT 'outside'
        CHECK (location_type IN ('inside', 'outside', 'inside_outside')),

    PRIMARY KEY (station_id, top_pick_id),

    FOREIGN KEY (station_id)
        REFERENCES stations(id)
        ON DELETE CASCADE,

    FOREIGN KEY (top_pick_id)
        REFERENCES top_picks(id)
        ON DELETE CASCADE
);

INSERT INTO station_top_picks_new (
    station_id,
    top_pick_id,
    sort_order,
    walking_minutes,
    floor_id,
    exit_id,
    location_type
)
SELECT
    station_id,
    top_pick_id,
    sort_order,
    walking_minutes,
    floor_id,
    exit_id,
    CASE location_type
        WHEN 'connected' THEN 'inside_outside'
        ELSE location_type
    END
FROM station_top_picks;

DROP TABLE station_top_picks;

ALTER TABLE station_top_picks_new RENAME TO station_top_picks;

CREATE INDEX idx_station_top_picks_top_pick_id
    ON station_top_picks(top_pick_id);

CREATE INDEX idx_station_top_picks_floor_id
    ON station_top_picks(floor_id);

CREATE INDEX idx_station_top_picks_exit_id
    ON station_top_picks(exit_id);
