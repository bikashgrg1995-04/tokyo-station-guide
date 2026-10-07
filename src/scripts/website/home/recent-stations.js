// Recently opened stations (localStorage) in the search panel.

import { searchable } from "./data.js";
import { recentHost, recentSection } from "./dom.js";
import { selectStationOnMap } from "./station-lookup.js";
import { esc } from "./utils.js";

const RECENT_SEARCH_KEY = "tokyo-recent-stations";

const MAX_RECENT = 6;

function getRecentStations() {
  try {
    var raw = localStorage.getItem(RECENT_SEARCH_KEY);

    if (!raw) {
      return [];
    }

    var slugs = JSON.parse(raw);

    if (!Array.isArray(slugs)) {
      return [];
    }

    return slugs
      .map(function (slug) {
        return searchable.find(function (s) {
          return s.slug === slug;
        });
      })
      .filter(Boolean)
      .slice(0, MAX_RECENT);
  } catch (e) {
    return [];
  }
}

export function saveRecentStation(slug) {
  if (!slug) {
    return;
  }

  try {
    var recent = [];

    var raw = localStorage.getItem(RECENT_SEARCH_KEY);

    if (raw) {
      var parsed = JSON.parse(raw);

      if (Array.isArray(parsed)) {
        recent = parsed;
      }
    }

    recent = recent.filter(function (item) {
      return item !== slug;
    });

    recent.unshift(slug);

    localStorage.setItem(
      RECENT_SEARCH_KEY,
      JSON.stringify(recent.slice(0, MAX_RECENT)),
    );
  } catch (e) {}
}

function getStationCode(station) {
  if (!station.codes || !station.codes.length) {
    return "";
  }

  return station.codes[0];
}

export function renderRecentStations() {
  var recent = getRecentStations();

  recentHost.innerHTML = "";

  if (!recent.length) {
    recentSection.hidden = true;

    return;
  }

  recentSection.hidden = false;

  recent.forEach(function (station) {
    var a = document.createElement("a");

    /*
     * Do NOT navigate to station detail.
     */

    a.href = "#";

    a.className = "recent-station";

    var code = getStationCode(station);

    var lineText = (station.lines || []).join(" · ");

    a.innerHTML =
      '<span class="recent-station-name">' +
      "<b>" +
      esc(station.name) +
      "</b>" +
      "<span>" +
      esc(
        station.jp
          ? station.jp + (lineText ? " · " + lineText : "")
          : lineText,
      ) +
      "</span>" +
      "</span>" +
      '<span class="recent-station-code">' +
      esc(code) +
      "</span>" +
      '<span class="recent-station-arrow" aria-hidden="true">→</span>';

    a.addEventListener("click", function (e) {
      e.preventDefault();

      selectStationOnMap(station.slug);
    });

    recentHost.appendChild(a);
  });
}
