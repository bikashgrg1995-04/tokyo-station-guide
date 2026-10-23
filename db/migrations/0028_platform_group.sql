-- Platform map: platforms can be grouped into separate diagrams
-- (e.g. "Deep underground"). Platforms without a group share the main diagram.
ALTER TABLE station_platforms ADD COLUMN platform_group TEXT;
ALTER TABLE station_platforms ADD COLUMN platform_group_japanese TEXT;
