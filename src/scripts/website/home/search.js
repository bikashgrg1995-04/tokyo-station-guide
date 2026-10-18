// Search overlay.

import { searchable } from "./data.js";
import { input, overlay, results, searchHome } from "./dom.js";
import { renderFeaturedStations } from "./featured-stations.js";
import { names, t } from "./i18n.js";
import { renderRecentStations } from "./recent-stations.js";
import { selectStationOnMap } from "./station-lookup.js";
import { $, esc } from "./utils.js";

function showSearchHome() {
  searchHome.hidden = false;

  results.innerHTML = "";

  renderFeaturedStations();
  renderRecentStations();
}

function showSearchResults(matches) {
  searchHome.hidden = true;

  /* The visitor's language is the bold name, the other one beside it. */
  results.innerHTML = matches.length
    ? matches
        .map(function (s) {
          var pair = names(s.name, s.jp);

          return (
            '<a class="result" href="#" data-slug="' +
            esc(s.slug) +
            '">' +
            "<b>" +
            esc(pair[0]) +
            "</b>" +
            "<span>" +
            esc(pair[1]) +
            "</span>" +
            "</a>"
          );
        })
        .join("")
    : '<p class="empty">' + esc(t("search.empty")) + "</p>";

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

/* Show what matches the box: the home view when it is empty. */
function runSearch() {
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
}

/* The language changed while the search is open: draw the list again. */
export function refreshSearchLanguage() {
  if (!overlay.hidden) {
    runSearch();
  }
}

export function initSearch() {
  /*
   * Automatic search.
   */
  input.addEventListener("input", runSearch);
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
