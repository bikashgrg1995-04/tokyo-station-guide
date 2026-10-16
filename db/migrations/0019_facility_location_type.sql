-- Whether a facility entry is inside the station or outside it.
-- Existing entries are floors of the station, so they start as 'inside'.
ALTER TABLE station_floor_facilities ADD COLUMN location_type TEXT
    NOT NULL DEFAULT 'inside'
    CHECK (location_type IN ('inside', 'outside'));
