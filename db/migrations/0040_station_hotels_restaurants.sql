-- Station page "Hotels" and "Restaurants": places with a photo. Hotels have a Booking.com link.
CREATE TABLE station_hotels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    station_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    name_japanese TEXT,
    kind TEXT,
    kind_japanese TEXT,
    location TEXT,
    location_japanese TEXT,
    description TEXT,
    description_japanese TEXT,
    map_url TEXT,
    booking_url TEXT,
    photo TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE
);
CREATE INDEX idx_station_hotels_order ON station_hotels(station_id, sort_order);

CREATE TABLE station_restaurants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    station_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    name_japanese TEXT,
    kind TEXT,
    kind_japanese TEXT,
    location TEXT,
    location_japanese TEXT,
    description TEXT,
    description_japanese TEXT,
    map_url TEXT,
    photo TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE
);
CREATE INDEX idx_station_restaurants_order ON station_restaurants(station_id, sort_order);

-- Note shown above the restaurant list (**text** is bold).
ALTER TABLE stations ADD COLUMN restaurants_note TEXT;
ALTER TABLE stations ADD COLUMN restaurants_note_japanese TEXT;
