-- Small key/value table for site-wide flags. content_version is bumped by every
-- admin change so the cached public pages are rebuilt at once.
CREATE TABLE IF NOT EXISTS site_meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT OR IGNORE INTO site_meta (key, value) VALUES ('content_version', '0');
