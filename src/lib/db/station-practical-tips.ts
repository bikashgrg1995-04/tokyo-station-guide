import {
  createStationTip,
  deleteStationTip,
  getStationTips,
  updateStationTip,
  type StationTip,
  type StationTipInput,
} from "./station-tips";

/** Practical tips live in station_tips with section = 'practical'. */
export type PracticalTip = StationTip;
export type PracticalTipInput = StationTipInput;

export const getPracticalTips = (db: D1Database, stationId: number) => getStationTips(db, stationId, "practical");
export const createPracticalTip = (db: D1Database, stationId: number, i: PracticalTipInput) =>
  createStationTip(db, stationId, i, "practical");
export const updatePracticalTip = (db: D1Database, stationId: number, id: number, i: PracticalTipInput) =>
  updateStationTip(db, stationId, id, i, "practical");
export const deletePracticalTip = (db: D1Database, stationId: number, id: number) =>
  deleteStationTip(db, stationId, id, "practical");
