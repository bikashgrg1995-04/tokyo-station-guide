
-- ============================================================
-- 0022: Japanese versions of every visitor-facing text field
--
-- The website has one EN / 日本語 switch. When it is on 日本語 the site
-- shows these columns, and falls back to the English text for any row
-- where the Japanese column is still empty (NULL).
--
-- Existing, unchanged: stations.name_japanese, station_floors.name_japanese,
-- top_picks.name_japanese.
--
-- Additive only: every column is nullable, so nothing existing breaks.
-- ============================================================

ALTER TABLE operators ADD COLUMN name_japanese TEXT;
ALTER TABLE operators ADD COLUMN description_japanese TEXT;

ALTER TABLE lines ADD COLUMN name_japanese TEXT;
ALTER TABLE lines ADD COLUMN description_japanese TEXT;

ALTER TABLE stations ADD COLUMN description_japanese TEXT;
ALTER TABLE stations ADD COLUMN about_japanese TEXT;

ALTER TABLE station_exits ADD COLUMN name_japanese TEXT;
ALTER TABLE station_exits ADD COLUMN description_japanese TEXT;

ALTER TABLE facilities ADD COLUMN name_japanese TEXT;

ALTER TABLE station_floor_facilities ADD COLUMN note_japanese TEXT;

ALTER TABLE station_platforms ADD COLUMN destinations_japanese TEXT;
ALTER TABLE station_platforms ADD COLUMN notes_japanese TEXT;

ALTER TABLE top_picks ADD COLUMN description_japanese TEXT;
ALTER TABLE top_picks ADD COLUMN notes_japanese TEXT;
ALTER TABLE top_picks ADD COLUMN entry_fee_japanese TEXT;

ALTER TABLE featured_stations ADD COLUMN description_japanese TEXT;

-- ------------------------------------------------------------
-- Backfill the well-known Japanese names that already exist in the
-- data, so the first switch to 日本語 is not empty. Only fills rows
-- that are still NULL; never overwrites something an admin typed.
-- ------------------------------------------------------------
UPDATE operators SET name_japanese = 'JR東日本'    WHERE slug = 'jr-east'     AND name_japanese IS NULL;
UPDATE operators SET name_japanese = '東京メトロ'  WHERE slug = 'tokyo-metro' AND name_japanese IS NULL;
UPDATE operators SET name_japanese = '京急電鉄'    WHERE slug = 'keikyu'      AND name_japanese IS NULL;

UPDATE lines SET name_japanese = '山手線'     WHERE slug = 'yamanote-line'    AND name_japanese IS NULL;
UPDATE lines SET name_japanese = '銀座線'     WHERE slug = 'ginza-line'       AND name_japanese IS NULL;
UPDATE lines SET name_japanese = '副都心線'   WHERE slug = 'fukutoshin-line'  AND name_japanese IS NULL;
UPDATE lines SET name_japanese = '京急本線'   WHERE slug = 'keikyu-main-line' AND name_japanese IS NULL;
