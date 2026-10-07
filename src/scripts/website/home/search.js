// Search overlay.

import { searchable } from "./data.js";
import { input, overlay, results, searchHome } from "./dom.js";
import { renderFeaturedStations } from "./featured-stations.js";
import { renderRecentStations } from "./recent-stations.js";
import { selectStationOnMap } from "./station-lookup.js";
import { $, esc } from "./utils.js";

/*
 * Kept for the station information button.
 *
 * Search items no longer use this.
 */
function stationHref(slug) {
  return "/stations/" + encodeURIComponent(slug);
}

function showSearchHome() {
  searchHome.hidden = false;

  results.innerHTML = "";

  renderFeaturedStations();
  renderRecentStations();
}

function showSearchResults(matches) {
  searchHome.hidden = true;

  results.innerHTML = matches.length
    ? matches
        .map(function (s) {
          return (
            '<a class="result" href="#" data-slug="' +
            esc(s.slug) +
            '">' +
            "<b>" +
            esc(s.jp || "") +
            "</b>" +
            "<span>" +
            esc(s.name) +
            "</span>" +
            "</a>"
          );
        })
        .join("")
    : '<p class="empty">No stations found. Try the English or Japanese name.</p>';

  results.querySelectorAll("a.result").forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();

      selectStationOnMap(a.getAttribute("data-slug"));
    });
  });
}

function openSearch() {
  overlay.hidden = false;

  input.value = "";

  showSearchHome();

  setTimeout(function () {
    input.focus();
  }, 30);
}

export function closeSearch() {
  overlay.hidden = true;
}

export function initSearch() {
  /*
   * Automatic search.
   */
  input.addEventListener("input", function () {
    var q = input.value.trim().toLowerCase();

    if (!q) {
      showSearchHome();

      return;
    }

    var m = searchable
      .filter(function (s) {
        var codeMatch = (s.codes || []).some(function (code) {
          return code.toLowerCase().includes(q);
        });

        return (
          (s.name || "").toLowerCase().includes(q) ||
          (s.jp || "").toLowerCase().includes(q) ||
          (s.slug || "").toLowerCase().includes(q) ||
          codeMatch
        );
      })
      .slice(0, 10);

    showSearchResults(m);
  });
  /*
   * Enter on search result.
   */
  $("#search-form").addEventListener("submit", function (e) {
    e.preventDefault();

    var first = results.querySelector("a.result");

    if (!first) {
      return;
    }

    selectStationOnMap(first.getAttribute("data-slug"));
  });
  $("#open-search").addEventListener("click", openSearch);
  $("#close-search").addEventListener("click", closeSearch);
  $("#search-backdrop").addEventListener("click", closeSearch);
}
