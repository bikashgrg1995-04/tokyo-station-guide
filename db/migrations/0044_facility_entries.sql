-- One facilities table: station_floor_facilities (floor, exits, inside/outside, icon via facility,
-- count) now also carries the description and photo that station_facility_guide used to hold.
ALTER TABLE station_floor_facilities ADD COLUMN photo TEXT;
ALTER TABLE station_floor_facilities ADD COLUMN photo_caption TEXT;
ALTER TABLE station_floor_facilities ADD COLUMN photo_caption_japanese TEXT;

-- Old guide rows are free text (no floor / facility link), so they cannot be converted automatically.
-- Kept under a new name for reference; re-enter them as facility entries (or re-import) and drop it later.
ALTER TABLE station_facility_guide RENAME TO station_facility_guide_old;
