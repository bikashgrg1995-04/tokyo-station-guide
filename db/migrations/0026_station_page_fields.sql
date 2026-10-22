-- Station page: location label ("Chiyoda City · Tokyo") and the main photo.
ALTER TABLE stations ADD COLUMN region TEXT;
ALTER TABLE stations ADD COLUMN region_japanese TEXT;
ALTER TABLE stations ADD COLUMN main_image TEXT;
