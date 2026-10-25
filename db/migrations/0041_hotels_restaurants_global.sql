-- Hotels and restaurants become their own records (like top picks) that are assigned to stations.
-- The per-station rows of 0040 are moved over: one hotel / restaurant each, linked to its station.

CREATE TABLE hotels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    name_japanese TEXT,
    kind TEXT,
    kind_japanese TEXT,
    description TEXT,
    description_japanese TEXT,
    map_url TEXT,
    booking_url TEXT,
    photo TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO hotels (slug, name, name_japanese, kind, kind_japanese, description, description_japanese, map_url, booking_url, photo)
SELECT 'hotel-' || id, name, name_japanese, kind, kind_japanese, description, description_japanese, map_url, booking_url, photo
FROM station_hotels;

CREATE TABLE station_hotels_new (
    station_id INTEGER NOT NULL,
    hotel_id INTEGER NOT NULL,
    location TEXT,
    location_japanese TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (station_id, hotel_id),
    FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE,
    FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE
);

INSERT INTO station_hotels_new (station_id, hotel_id, location, location_japanese, sort_order)
SELECT o.station_id, h.id, o.location, o.location_japanese, o.sort_order
FROM station_hotels o JOIN hotels h ON h.slug = 'hotel-' || o.id;

DROP TABLE station_hotels;
ALTER TABLE station_hotels_new RENAME TO station_hotels;
CREATE INDEX idx_station_hotels_order ON station_hotels(station_id, sort_order);
CREATE INDEX idx_station_hotels_hotel ON station_hotels(hotel_id);

CREATE TABLE restaurants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    name_japanese TEXT,
    kind TEXT,
    kind_japanese TEXT,
    description TEXT,
    description_japanese TEXT,
    map_url TEXT,
    photo TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO restaurants (slug, name, name_japanese, kind, kind_japanese, description, description_japanese, map_url, photo)
SELECT 'restaurant-' || id, name, name_japanese, kind, kind_japanese, description, description_japanese, map_url, photo
FROM station_restaurants;

CREATE TABLE station_restaurants_new (
    station_id INTEGER NOT NULL,
    restaurant_id INTEGER NOT NULL,
    location TEXT,
    location_japanese TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (station_id, restaurant_id),
    FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

INSERT INTO station_restaurants_new (station_id, restaurant_id, location, location_japanese, sort_order)
SELECT o.station_id, r.id, o.location, o.location_japanese, o.sort_order
FROM station_restaurants o JOIN restaurants r ON r.slug = 'restaurant-' || o.id;

DROP TABLE station_restaurants;
ALTER TABLE station_restaurants_new RENAME TO station_restaurants;
CREATE INDEX idx_station_restaurants_order ON station_restaurants(station_id, sort_order);
CREATE INDEX idx_station_restaurants_restaurant ON station_restaurants(restaurant_id);
