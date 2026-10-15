-- Stations store a map link instead of raw coordinates, and the verified
-- date is picked by the admin (a plain YYYY-MM-DD date).

ALTER TABLE stations ADD COLUMN location_url TEXT;

UPDATE stations
SET location_url = 'https://www.google.com/maps?q=' || latitude || ',' || longitude
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

UPDATE stations
SET verified_at = substr(verified_at, 1, 10)
WHERE verified_at IS NOT NULL;

ALTER TABLE stations DROP COLUMN latitude;
ALTER TABLE stations DROP COLUMN longitude;
