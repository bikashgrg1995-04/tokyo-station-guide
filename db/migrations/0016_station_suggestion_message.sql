-- Station suggestions become a plain message from the visitor:
-- "which station, on which line, and what should change".
-- The admin reads it and updates the station by hand, so nothing is
-- applied automatically any more.
--
-- Older rows keep their suggested_* columns; the admin page still
-- shows them (read-only) for reference.

ALTER TABLE station_suggestions
    ADD COLUMN line_id INTEGER
    REFERENCES lines(id) ON DELETE SET NULL;

ALTER TABLE station_suggestions
    ADD COLUMN message TEXT;

CREATE INDEX idx_station_suggestions_line_id
    ON station_suggestions(line_id);
