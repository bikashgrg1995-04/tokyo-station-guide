-- ============================================================
-- Optional dark-theme icon for a facility.
-- Holds an R2 object key (facility-icons/...), like facilities.icon.
-- When it is empty the website uses the normal icon in dark mode too.
-- ============================================================

ALTER TABLE facilities
ADD COLUMN icon_dark TEXT;
