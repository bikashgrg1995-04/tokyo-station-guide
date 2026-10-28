-- Platform map: legend category (label + swatch colour), a note per diagram ("their own numbers 1-4"),
-- and the direction of the map (what is on the left / right, north arrow).
ALTER TABLE station_platforms ADD COLUMN legend_label TEXT;
ALTER TABLE station_platforms ADD COLUMN legend_label_japanese TEXT;
ALTER TABLE station_platforms ADD COLUMN legend_color TEXT;
ALTER TABLE station_platforms ADD COLUMN group_note TEXT;
ALTER TABLE station_platforms ADD COLUMN group_note_japanese TEXT;

ALTER TABLE stations ADD COLUMN platform_map_left TEXT;
ALTER TABLE stations ADD COLUMN platform_map_left_japanese TEXT;
ALTER TABLE stations ADD COLUMN platform_map_right TEXT;
ALTER TABLE stations ADD COLUMN platform_map_right_japanese TEXT;
ALTER TABLE stations ADD COLUMN platform_map_north INTEGER NOT NULL DEFAULT 0;
