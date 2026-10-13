
CREATE TABLE station_floor_facility_exits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  station_floor_facility_id INTEGER NOT NULL,
  station_exit_id INTEGER NOT NULL,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (station_floor_facility_id)
    REFERENCES station_floor_facilities(id)
    ON DELETE CASCADE,

  FOREIGN KEY (station_exit_id)
    REFERENCES station_exits(id)
    ON DELETE CASCADE,

  UNIQUE (station_floor_facility_id, station_exit_id)
);

CREATE INDEX idx_station_floor_facility_exits_assignment
  ON station_floor_facility_exits(station_floor_facility_id);

CREATE INDEX idx_station_floor_facility_exits_exit
  ON station_floor_facility_exits(station_exit_id);
