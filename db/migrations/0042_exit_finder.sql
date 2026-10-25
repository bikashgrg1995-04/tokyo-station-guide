-- "Which exit?" section: which exits belong to which side, and the places
-- (sights, food, hotels, transport, help) each exit is the best way to reach.

CREATE TABLE station_side_exits (
    side_id INTEGER NOT NULL REFERENCES station_sides(id) ON DELETE CASCADE,
    exit_id INTEGER NOT NULL REFERENCES station_exits(id) ON DELETE CASCADE,
    PRIMARY KEY (side_id, exit_id)
);

CREATE INDEX idx_station_side_exits_exit_id ON station_side_exits(exit_id);

CREATE TABLE station_exit_places (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    station_id INTEGER NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    name_japanese TEXT,
    category TEXT NOT NULL DEFAULT 'sights'
        CHECK (category IN ('sights', 'food', 'hotels', 'transport', 'help')),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_station_exit_places_station_id ON station_exit_places(station_id, sort_order);

CREATE TABLE station_exit_place_exits (
    place_id INTEGER NOT NULL REFERENCES station_exit_places(id) ON DELETE CASCADE,
    exit_id INTEGER NOT NULL REFERENCES station_exits(id) ON DELETE CASCADE,
    note TEXT,
    note_japanese TEXT,
    PRIMARY KEY (place_id, exit_id)
);

CREATE INDEX idx_station_exit_place_exits_exit_id ON station_exit_place_exits(exit_id);
