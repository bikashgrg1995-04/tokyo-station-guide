-- Suggestions are now a single message. Keep whatever older rows said by
-- folding it into `message`, then drop the unused field-by-field columns.

UPDATE station_suggestions
SET message = TRIM(
    COALESCE(reason, '') ||
    CASE WHEN suggested_name IS NOT NULL AND suggested_name <> ''
         THEN char(10) || 'Name: ' || suggested_name ELSE '' END ||
    CASE WHEN suggested_name_japanese IS NOT NULL AND suggested_name_japanese <> ''
         THEN char(10) || 'Japanese name: ' || suggested_name_japanese ELSE '' END ||
    CASE WHEN suggested_description IS NOT NULL AND suggested_description <> ''
         THEN char(10) || 'Description: ' || suggested_description ELSE '' END ||
    CASE WHEN suggested_about IS NOT NULL AND suggested_about <> ''
         THEN char(10) || 'About: ' || suggested_about ELSE '' END ||
    CASE WHEN suggested_latitude IS NOT NULL
         THEN char(10) || 'Latitude: ' || suggested_latitude ELSE '' END ||
    CASE WHEN suggested_longitude IS NOT NULL
         THEN char(10) || 'Longitude: ' || suggested_longitude ELSE '' END
)
WHERE message IS NULL OR message = '';

ALTER TABLE station_suggestions DROP COLUMN suggested_name;
ALTER TABLE station_suggestions DROP COLUMN suggested_name_japanese;
ALTER TABLE station_suggestions DROP COLUMN suggested_description;
ALTER TABLE station_suggestions DROP COLUMN suggested_about;
ALTER TABLE station_suggestions DROP COLUMN suggested_latitude;
ALTER TABLE station_suggestions DROP COLUMN suggested_longitude;
ALTER TABLE station_suggestions DROP COLUMN suggested_lines;
ALTER TABLE station_suggestions DROP COLUMN suggested_platforms;
ALTER TABLE station_suggestions DROP COLUMN suggested_facilities;
ALTER TABLE station_suggestions DROP COLUMN suggested_top_picks;
ALTER TABLE station_suggestions DROP COLUMN reason;
ALTER TABLE station_suggestions DROP COLUMN submitter_name;
ALTER TABLE station_suggestions DROP COLUMN submitter_email;
