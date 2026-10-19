
-- ============================================================
-- 0024: Three-state website status per line
--
-- lines.website_status
--   'live'         = browsable on the website
--   'coming_soon'  = listed in the line picker as "Coming soon"
--   'hidden'       = not shown in the line picker at all
--
-- is_published (0023) is kept in sync (1 only for 'live') so older
-- queries keep working.
-- ============================================================

ALTER TABLE lines ADD COLUMN website_status TEXT NOT NULL DEFAULT 'coming_soon'
    CHECK (website_status IN ('live', 'coming_soon', 'hidden'));

UPDATE lines
SET website_status = CASE WHEN is_published = 1 THEN 'live' ELSE 'coming_soon' END;
