// The station details sheet.

import { list } from "./current-line.js";
import { data, searchable } from "./data.js";
import { sheet } from "./dom.js";
import { state } from "./state.js";
import { findLinesForStation } from "./station-lookup.js";
import { $, esc, num, toList } from "./utils.js";

/*
 * Read a field from the line's station object first,
 * then from the matching searchable item.
 */
function stationField(stn, names) {
  var extra =
    searchable.find(function (s) {
      return s.slug === stn.slug;
    }) || {};

  for (var i = 0; i < names.length; i++) {
    var v = stn[names[i]];

    if (v == null || v === "") {
      v = extra[names[i]];
    }

    if (v != null && v !== "") {
      return v;
    }
  }

  return null;
}

function stationConnections(stn) {
  var raw = stationField(stn, ["connections"]);

  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch (e) {
      raw = null;
    }
  }

  var out = [];

  if (Array.isArray(raw)) {
    raw.forEach(function (i) {
      if (typeof i === "string") {
        out.push({ name: i });
      } else if (i && i.name) {
        out.push({ name: i.name, color: i.color });
      }
    });
  }

  if (out.length) {
    return out;
  }

  /*
   * Fallback: other lines that stop at this station.
   */
  findLinesForStation(stn.slug).forEach(function (m) {
    if (m.lineIndex !== state.lineIdx) {
      out.push({
        name: m.lineName,
        color: data.lines[m.lineIndex].color,
      });
    }
  });

  return out;
}

function sheetSection(title, inner) {
  return (
    '<section class="sheet-sec"><h4>' +
    esc(title) +
    "</h4>" +
    inner +
    "</section>"
  );
}

function sheetChips(items) {
  return (
    '<div class="sheet-chips">' +
    items
      .map(function (t) {
        return "<span>" + esc(t) + "</span>";
      })
      .join("") +
    "</div>"
  );
}

/*
 * Reset the suggestion form and populate it with the
 * selected station's current information.
 */
function prepareSuggestionForm(stn) {
  var form = $("#station-suggestion-form");
  var section = $("#sheet-edit-form");
  var button = $("#sheet-suggest-edit");
  var message = $("#suggestion-message");

  form.reset();

  $("#suggestion-station-id").value = stn.id != null ? String(stn.id) : "";

  $("#suggestion-name").value = stn.name || "";
  $("#suggestion-name-japanese").value = stn.jp || "";

  $("#suggestion-description").value =
    stationField(stn, ["description", "summary"]) || "";

  $("#suggestion-about").value = stationField(stn, ["about"]) || "";

  var latitude = stationField(stn, ["latitude"]);
  var longitude = stationField(stn, ["longitude"]);

  $("#suggestion-latitude").value = latitude != null ? String(latitude) : "";

  $("#suggestion-longitude").value = longitude != null ? String(longitude) : "";

  section.hidden = true;
  button.setAttribute("aria-expanded", "false");

  message.textContent = "";
  message.hidden = true;
}

function openSheet() {
  var stn = list()[state.idx];

  if (!stn) {
    return;
  }

  var m = String(stn.code || "").match(/^([A-Za-z]+)\s*-?\s*(\d+)\s*$/);

  $("#sheet-prefix").textContent = m ? m[1].toUpperCase() : "";
  $("#sheet-num").textContent = m ? m[2] : num(stn.code);
  $("#sheet-jp").textContent = stn.jp || stn.name;
  $("#sheet-en").textContent = stn.name;

  var html = "";

  var about = stationField(stn, ["about", "description", "summary"]);

  if (about) {
    html += sheetSection("About", "<p>" + esc(about) + "</p>");
  }

  var facilities = toList(stationField(stn, ["facilities"]));

  if (facilities.length) {
    html += sheetSection("Facilities", sheetChips(facilities));
  }

  var picks = toList(
    stationField(stn, ["top_picks", "topPicks", "highlights"]),
  );

  if (picks.length) {
    html += sheetSection("Top Picks", sheetChips(picks));
  }

  var conns = stationConnections(stn);

  if (conns.length) {
    html += sheetSection(
      "Connections",
      '<ul class="sheet-conns">' +
        conns
          .map(function (c) {
            return (
              "<li><i" +
              (c.color ? ' style="--c:' + esc(c.color) + '"' : "") +
              "></i><b>" +
              esc(c.name) +
              "</b></li>"
            );
          })
          .join("") +
        "</ul>",
    );
  }

  $("#sheet-body").innerHTML = html;
  $("#sheet-body").scrollTop = 0;

  prepareSuggestionForm(stn);

  sheet.hidden = false;
  $("#sheet-close").focus();
}

export function closeSheet() {
  sheet.hidden = true;
}

export function initStationSheet() {
  $("#info-link").addEventListener("click", function (e) {
    if (!list()[state.idx]) {
      return;
    }

    e.preventDefault();
    openSheet();
  });

  $("#sheet-suggest-edit").addEventListener("click", function () {
    var section = $("#sheet-edit-form");
    var button = $("#sheet-suggest-edit");
    var opening = section.hidden;

    section.hidden = !opening;
    button.setAttribute("aria-expanded", String(opening));

    if (opening) {
      section.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });

      $("#suggestion-name").focus();
    }
  });

  $("#sheet-cancel-edit").addEventListener("click", function () {
    $("#sheet-edit-form").hidden = true;
    $("#sheet-suggest-edit").setAttribute("aria-expanded", "false");

    var message = $("#suggestion-message");
    message.hidden = true;
    message.textContent = "";
  });

  $;
  $("#station-suggestion-form").addEventListener(
    "submit",
    async function (event) {
      event.preventDefault();

      var form = event.currentTarget;
      var message = $("#suggestion-message");
      var submitButton = $("#sheet-submit-edit");

      if (submitButton.disabled) {
        return;
      }

      message.hidden = true;
      message.textContent = "";

      submitButton.disabled = true;
      submitButton.textContent = "Submitting...";

      try {
        var response = await fetch("/api/station-suggestions", {
          method: "POST",
          body: new FormData(form),
          headers: {
            Accept: "application/json",
          },
        });

        var result = await response.json();

        if (!response.ok || !result.ok) {
          throw new Error(
            result.message ||
              "Unable to submit your suggestion. Please try again.",
          );
        }

        message.textContent =
          result.message || "Your suggestion has been submitted for review.";
        message.hidden = false;

        form.reset();

        var stationId = $("#suggestion-station-id").value;

        /*
         * Re-populate the form with the selected station's
         * current values after a successful submission.
         */
        var stn = list()[state.idx];

        if (stn && String(stn.id) === stationId) {
          prepareSuggestionForm(stn);
        }

        /*
         * Show the success message after preparing the form,
         * because preparation clears the message.
         */
        message.textContent =
          result.message || "Your suggestion has been submitted for review.";
        message.hidden = false;
      } catch (error) {
        message.textContent =
          error instanceof Error
            ? error.message
            : "A network error occurred. Please try again.";

        message.hidden = false;
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Submit Suggestion";
      }
    },
  );

  $("#sheet-close").addEventListener("click", closeSheet);
  $("#sheet-backdrop").addEventListener("click", closeSheet);
}
