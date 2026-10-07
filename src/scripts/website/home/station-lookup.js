// Finding stations / lines and selecting a station on the map.

import { data, searchable } from "./data.js";
import { go, setLine } from "./navigation.js";
import { saveRecentStation } from "./recent-stations.js";
import { closeSearch } from "./search.js";
import { state } from "./state.js";

/*
 * Find a station in a specific line.
 */
function findStationIndexInLine(lineId, slug) {
  var stations = data.stationsByLine[lineId] || [];

  for (var i = 0; i < stations.length; i++) {
    if (stations[i].slug === slug) {
      return i;
    }
  }

  return -1;
}

/*
 * Find every line that contains a station.
 *
 * A station can belong to multiple lines.
 */
export function findLinesForStation(slug) {
  var matches = [];

  data.lines.forEach(function (l, i) {
    var stationIndex = findStationIndexInLine(String(l.id), slug);

    if (stationIndex >= 0) {
      matches.push({
        lineIndex: i,
        stationIndex: stationIndex,
        lineId: l.id,
        lineName: l.name,
      });
    }
  });

  return matches;
}

/*
 * Select station from:
 *
 * - Search result
 * - Featured station
 * - Recent station
 *
 * Behavior:
 *
 * 1. If station exists on current line:
 *      stay on current line.
 *
 * 2. If station does not exist on current line:
 *      automatically switch to the first matching line.
 *
 * 3. Train animates toward selected station.
 *
 * Every successful selection is saved to Recent here,
 * so callers must NOT call saveRecentStation themselves.
 */
export function selectStationOnMap(slug) {
  if (!slug) {
    console.warn("[select] empty slug");
    return;
  }

  var station = searchable.find(function (s) {
    return s.slug === slug;
  });

  if (!station) {
    console.warn("[select] slug not in searchable:", slug);
    return;
  }

  var matches = findLinesForStation(station.slug);

  if (!matches.length) {
    console.warn("[select] station not on any line:", station.slug);
    return;
  }

  /*
   * Save every successfully selected station
   * to Recent.
   */
  saveRecentStation(station.slug);

  /*
   * Prefer the current line if possible.
   */
  var selected = matches.find(function (item) {
    return item.lineIndex === state.lineIdx;
  });

  /*
   * Otherwise use the first matching line.
   */
  if (!selected) {
    selected = matches[0];
  }

  closeSearch();

  /*
   * Same line:
   * Keep current train position and animate
   * directly to the selected station.
   */
  if (selected.lineIndex === state.lineIdx) {
    go(selected.stationIndex);
    return;
  }

  /*
   * Different line:
   * Switch line and animate train from the
   * beginning of that line to the station.
   */
  setLine(selected.lineIndex, {
    stationIndex: selected.stationIndex,
    animateToStation: true,
  });
}

export function initStationSelect() {
  /*
   * Search overlay sends this event.
   *
   * Keeping this as a CustomEvent makes the search
   * system independent from the map internals.
   */
  document.addEventListener("station-select", function (event) {
    var detail = event.detail;

    if (!detail || !detail.slug) {
      return;
    }

    selectStationOnMap(detail.slug);
  });
}
