-- Station page: facility groups ("At this station") and the three stat cards.

ALTER TABLE facilities ADD COLUMN category TEXT NOT NULL DEFAULT 'other'
  CHECK (category IN ('storage', 'tickets', 'access', 'shops', 'transport', 'other'));

-- Best-effort grouping of the facilities that already exist (editable in Admin > Facilities).
UPDATE facilities SET category = 'storage'
  WHERE slug LIKE '%locker%' OR slug LIKE '%storage%' OR slug LIKE '%luggage%'
     OR slug LIKE '%baggage%' OR slug LIKE '%forwarding%';
UPDATE facilities SET category = 'tickets'
  WHERE category = 'other' AND (slug LIKE '%ticket%' OR slug LIKE '%pass%' OR slug LIKE '%info%'
     OR slug LIKE '%office%' OR slug LIKE '%reservation%' OR slug LIKE '%gate%');
UPDATE facilities SET category = 'access'
  WHERE category = 'other' AND (slug LIKE '%elevator%' OR slug LIKE '%escalator%' OR slug LIKE '%access%'
     OR slug LIKE '%wheelchair%' OR slug LIKE '%toilet%' OR slug LIKE '%restroom%'
     OR slug LIKE '%baby%' OR slug LIKE '%nursing%' OR slug LIKE '%stair%');
UPDATE facilities SET category = 'shops'
  WHERE category = 'other' AND (slug LIKE '%atm%' OR slug LIKE '%exchange%' OR slug LIKE '%wifi%'
     OR slug LIKE '%wi-fi%' OR slug LIKE '%store%' OR slug LIKE '%shop%' OR slug LIKE '%police%'
     OR slug LIKE '%convenience%' OR slug LIKE '%bank%');
UPDATE facilities SET category = 'transport'
  WHERE category = 'other' AND (slug LIKE '%taxi%' OR slug LIKE '%bus%' OR slug LIKE '%shinkansen%'
     OR slug LIKE '%airport%' OR slug LIKE '%train%' OR slug LIKE '%rental%');

-- The three stat cards under "At this station". The line count is automatic;
-- everything else is typed in Admin > Stations > Edit. A blank value hides the card.
ALTER TABLE stations ADD COLUMN stat_lines_note TEXT;
ALTER TABLE stations ADD COLUMN stat_lines_note_japanese TEXT;
ALTER TABLE stations ADD COLUMN stat_riders_value TEXT;
ALTER TABLE stations ADD COLUMN stat_riders_note TEXT;
ALTER TABLE stations ADD COLUMN stat_riders_note_japanese TEXT;
ALTER TABLE stations ADD COLUMN stat_opened_value TEXT;
ALTER TABLE stations ADD COLUMN stat_opened_note TEXT;
ALTER TABLE stations ADD COLUMN stat_opened_note_japanese TEXT;
