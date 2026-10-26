-- One tips table with a "section": 'exits' (under "Exits & station tips") or 'practical' ("Practical tips").
ALTER TABLE station_tips ADD COLUMN section TEXT NOT NULL DEFAULT 'exits';

INSERT INTO station_tips (station_id, tip, tip_japanese, sort_order, section, created_at, updated_at)
SELECT station_id, tip, tip_japanese, sort_order, 'practical', created_at, updated_at
FROM station_practical_tips;

DROP TABLE station_practical_tips;

CREATE INDEX IF NOT EXISTS idx_station_tips_station_section ON station_tips (station_id, section, sort_order);
