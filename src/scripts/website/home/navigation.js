// Previous / next station, line switching, board update, keyboard.

import { line, list } from "./current-line.js";
import { data } from "./data.js";
import { names, pick, t } from "./i18n.js";
import { markActiveRow } from "./lines-dialog.js";
import { drawMap } from "./map-render.js";
import { state } from "./state.js";
import { initTrain, moveTrain } from "./train.js";
import { $, num } from "./utils.js";

function updateMap() {
  document.querySelectorAll(".stn").forEach(function (g) {
    g.classList.toggle(
      "current",
      Number(g.getAttribute("data-i")) === state.idx,
    );
  });

  /*
   * Move current station to the top
   * of paint order.
   */

  var cur = document.querySelector('.stn[data-i="' + state.idx + '"]');

  if (cur) {
    cur.parentNode.appendChild(cur);
  }

  moveTrain();
}

function updateBoard() {
  var l = list();

  var cur = l[state.idx];

  var prev = l[state.idx - 1];

  var next = l[state.idx + 1];

  $("#line-name").textContent = pick(line().name, line().jp);

  var cw = document.querySelector(".current");

  cw.classList.remove("swap");

  void cw.offsetWidth;

  cw.classList.add("swap");

  /*
   * The board is bilingual like a station sign: the visitor's language is
   * the big name and the other one sits underneath. (The element ids still
   * say jp / en; they just hold "main" and "sub".)
   */

  var curNames = cur ? names(cur.name, cur.jp) : ["—", ""];

  $("#cur-jp").textContent = curNames[0];

  $("#cur-en").textContent = curNames[1];

  $("#cur-code").textContent = cur ? cur.code || "" : "";

  $("#cur-code").hidden = !(cur && cur.code);

  function side(prefix, s) {
    var btn = $("#" + prefix + "-btn");

    btn.disabled = !s;

    var pair = s ? names(s.name, s.jp) : ["", ""];

    $("#" + prefix + "-jp").textContent = pair[0];

    $("#" + prefix + "-en").textContent = pair[1];

    $("#" + prefix + "-num").textContent = s ? num(s.code) : "";

    $("#" + prefix + "-num").hidden = !s;
  }

  side("prev", prev);

  side("next", next);
}

/*
 * The language changed: redraw the labels and the board in place.
 * The line, the station, the zoom and the train all stay where they are.
 */
export function refreshLanguage() {
  if (!data.lines.length) {
    $("#line-name").textContent = t("board.noLines");

    return;
  }

  drawMap();

  updateBoard();

  updateMap();

  markActiveRow();
}

export function go(i) {
  var n = list().length;

  if (!n) {
    return;
  }

  state.idx = Math.max(0, Math.min(i, n - 1));

  updateBoard();
  updateMap();
}

/*
 * setLine now accepts an optional station index.
 *
 * resetTrainToZero:
 *   true  = normal manual line selection
 *   false = search-driven line switching
 *
 * For search-driven switching we initialize the train
 * at station 0, then call go(targetIndex), so the train
 * visibly moves toward the searched station.
 */
export function setLine(i, options) {
  options = options || {};

  var targetIndex = Number.isInteger(options.stationIndex)
    ? options.stationIndex
    : 0;

  var animateToStation = options.animateToStation === true;

  state.lineIdx = i;

  /*
   * Normal line selection starts at station 0.
   */

  state.idx = animateToStation ? 0 : targetIndex;

  state.zoom = 1;

  drawMap();

  initTrain();

  updateBoard();

  /*
   * Search-driven line change:
   *
   * train starts at station 0
   * then moves to requested station.
   */

  if (animateToStation) {
    go(targetIndex);
  } else {
    updateMap();
  }

  markActiveRow();
}

export function initBoardButtons() {
  $("#prev-btn").addEventListener("click", function () {
    go(state.idx - 1);
  });
  $("#next-btn").addEventListener("click", function () {
    go(state.idx + 1);
  });
}

export function initKeyboardNav() {
  document.addEventListener("keydown", function (e) {
    if (
      !$("#search-overlay").hidden ||
      !$("#lines-dialog").hidden ||
      !$("#station-sheet").hidden
    ) {
      return;
    }

    if (e.key === "ArrowLeft") {
      go(state.idx - 1);
    }

    if (e.key === "ArrowRight") {
      go(state.idx + 1);
    }
  });
}

export function selectInitialLine() {
  if (data.lines.length) {
    var start = 0;

    /*
     * Prefer loop line on initial load.
     */

    for (var k = 0; k < data.lines.length; k++) {
      if (data.lines[k].shape === "loop") {
        start = k;

        break;
      }
    }

    setLine(start);
  } else {
    $("#line-name").textContent = t("board.noLines");
  }
}
