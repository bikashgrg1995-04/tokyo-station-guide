-- Exit photos now belong to the exit itself (upload in Manage Exits), so an exit that was
-- imported from Excel can get its photo later. The separate photo list is replaced.
ALTER TABLE station_exits ADD COLUMN photo TEXT;
ALTER TABLE station_exits ADD COLUMN photo_caption TEXT;
ALTER TABLE station_exits ADD COLUMN photo_caption_japanese TEXT;

-- Keep photos that were already uploaded: match them to the exit with the same name.
UPDATE station_exits SET
  photo = (SELECT p.image FROM station_exit_photos p
           WHERE p.station_id = station_exits.station_id AND p.title = station_exits.name AND p.image IS NOT NULL
           ORDER BY p.id LIMIT 1),
  photo_caption = (SELECT p.caption FROM station_exit_photos p
           WHERE p.station_id = station_exits.station_id AND p.title = station_exits.name AND p.image IS NOT NULL
           ORDER BY p.id LIMIT 1),
  photo_caption_japanese = (SELECT p.caption_japanese FROM station_exit_photos p
           WHERE p.station_id = station_exits.station_id AND p.title = station_exits.name AND p.image IS NOT NULL
           ORDER BY p.id LIMIT 1);

DROP TABLE station_exit_photos;
