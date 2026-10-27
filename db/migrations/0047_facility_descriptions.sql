-- A facility entry has three separate texts, each used in one place:
--   note / note_japanese             -> the map popup (short)
--   description / description_japanese -> the "Facilities" table on the station page
--   photo_caption / ..._japanese       -> the caption under the photo card
-- Until now `note` fed both the popup and the page table, so the page text starts as a copy of it.
ALTER TABLE station_floor_facilities ADD COLUMN description TEXT;
ALTER TABLE station_floor_facilities ADD COLUMN description_japanese TEXT;
UPDATE station_floor_facilities SET description = note, description_japanese = note_japanese;
