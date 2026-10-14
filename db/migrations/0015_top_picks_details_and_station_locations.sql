
-- ============================================================
-- 0015: Extend Top Picks details and station-specific locations
-- ============================================================

-- Attraction details shared across all station associations.
ALTER TABLE top_picks ADD COLUMN entry_fee TEXT;
ALTER TABLE top_picks ADD COLUMN notes TEXT;

-- Station-specific location information.
ALTER TABLE station_top_picks ADD COLUMN floor_id INTEGER
    REFERENCES station_floors(id) ON DELETE SET NULL;

ALTER TABLE station_top_picks ADD COLUMN exit_id INTEGER
    REFERENCES station_exits(id) ON DELETE SET NULL;

ALTER TABLE station_top_picks ADD COLUMN location_type TEXT
    NOT NULL DEFAULT 'outside'
    CHECK (location_type IN ('inside', 'connected', 'outside'));

CREATE INDEX IF NOT EXISTS idx_station_top_picks_floor_id
    ON station_top_picks(floor_id);

CREATE INDEX IF NOT EXISTS idx_station_top_picks_exit_id
    ON station_top_picks(exit_id);

-- Opening hours can differ for each day of the week.
CREATE TABLE IF NOT EXISTS top_pick_opening_hours (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    top_pick_id INTEGER NOT NULL
        REFERENCES top_picks(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL
        CHECK (day_of_week BETWEEN 0 AND 6),
    is_closed INTEGER NOT NULL DEFAULT 0
        CHECK (is_closed IN (0, 1)),
    opening_time TEXT,
    closing_time TEXT,
    last_entry_time TEXT,
    UNIQUE (top_pick_id, day_of_week),

    CHECK (
        (is_closed = 1 AND opening_time IS NULL AND closing_time IS NULL)
        OR
        (is_closed = 0 AND opening_time IS NOT NULL AND closing_time IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_top_pick_opening_hours_top_pick_id
    ON top_pick_opening_hours(top_pick_id);
