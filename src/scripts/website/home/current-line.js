// Accessors for the selected line and positions on its track.

import { data } from "./data.js";
import { state } from "./state.js";

export function line() {
  return data.lines[state.lineIdx];
}

export function list() {
  return data.stationsByLine[line().id] || [];
}

export function pointAt(s) {
  return state.track.pointAt(s);
}

export function sOf(i) {
  return state.track.sOf(i);
}
