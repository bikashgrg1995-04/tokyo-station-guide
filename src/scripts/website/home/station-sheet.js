// The station details sheet.

import { list } from "./current-line.js";
import { data, searchable } from "./data.js";
import { sheet } from "./dom.js";
import { state } from "./state.js";
import { findLinesForStation } from "./station-lookup.js";
import { $, esc, num, toList } from "./utils.js";

/*
 * Read a field from the line's station object first,
 * then from the matching `searchable` item.
 * Accepts several possible field names.
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

  $("#sheet-full").href = stn.slug
    ? "/stations/" + encodeURIComponent(stn.slug)
    : "#";

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
  $("#sheet-close").addEventListener("click", closeSheet);
  $("#sheet-backdrop").addEventListener("click", closeSheet);
}
