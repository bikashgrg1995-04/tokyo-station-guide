
PRAGMA foreign_keys = ON;

CREATE TABLE station_suggestions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    station_id INTEGER NOT NULL,

    suggested_name TEXT,
    suggested_name_japanese TEXT,
    suggested_description TEXT,
    suggested_about TEXT,
    suggested_latitude REAL,
    suggested_longitude REAL,

    reason TEXT,
    submitter_name TEXT,
    submitter_email TEXT,

    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),

    reviewed_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (station_id)
        REFERENCES stations(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_station_suggestions_status_created
    ON station_suggestions(status, created_at);

CREATE INDEX idx_station_suggestions_station_id
    ON station_suggestions(station_id);
