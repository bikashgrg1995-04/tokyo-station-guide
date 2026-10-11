ALTER TABLE stations
ADD COLUMN is_verified INTEGER NOT NULL DEFAULT 0
CHECK (is_verified IN (0, 1));

ALTER TABLE stations
ADD COLUMN verified_at TEXT;