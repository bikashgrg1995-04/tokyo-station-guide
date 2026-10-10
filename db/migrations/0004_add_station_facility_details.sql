-- ============================================================
-- Station Facility Details
-- ============================================================

ALTER TABLE station_facilities
ADD COLUMN facility_count INTEGER
    CHECK (facility_count IS NULL OR facility_count >= 0);

ALTER TABLE station_facilities
ADD COLUMN floor TEXT;