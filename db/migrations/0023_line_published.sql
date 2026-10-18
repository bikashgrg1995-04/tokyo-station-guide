
-- ============================================================
-- 0023: Choose per line whether it is browsable or "Coming soon"
--
-- lines.is_published
--   1 = the line (and its stations) can be browsed on the website
--   0 = the line is only listed in the line picker as "Coming soon"
--
-- This replaces the hard-coded READY_LINE_NAMES list. The Yamanote Line,
-- the only line that list contained, stays published; admins switch the
-- others on from Admin > Lines.
-- ============================================================

ALTER TABLE lines ADD COLUMN is_published INTEGER NOT NULL DEFAULT 0
    CHECK (is_published IN (0, 1));

UPDATE lines SET is_published = 1 WHERE name = 'Yamanote Line';
