// Previous / next station, line switching, board update, keyboard.

import { line, list } from "./current-line.js";
import { data } from "./data.js";
import { names, pick, t } from "./i18n.js";
import { markActiveRow } from "./lines-dialog.js";
import { drawMap } from "./map-render.js";
import { state } from "./state.js";
import { initTrain, moveTrain } from "./train.js";
import { $ } from "./utils.js";

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

/*
 * The numbers on the board follow the stop order of the line (1, 2, 3 ...),
 * so the previous / current / next signs always count up by one. Letters come
 * from the station's own code, or from the line's code when it has none.
 */
function seqParts(s, index) {
  var letters = s
    ? String(s.code || "")
        .replace(/\d+\s*$/, "")
        .trim()
    : "";

  if (!letters) letters = String(line().code || "").trim();

  var n = index + 1;

  return { letters: letters, digits: n < 10 ? "0" + n : String(n) };
}

function updateBoard() {
  var l = list();

  var cur = l[state.idx];

  /* A loop line has no end: after the last station comes the first. */
  var around = l.length > 1 && line().shape === "loop";

  var prev = around
    ? l[(state.idx - 1 + l.length) % l.length]
    : l[state.idx - 1];

  var next = around ? l[(state.idx + 1) % l.length] : l[state.idx + 1];

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

  var curSeq = cur ? seqParts(cur, state.idx) : null;

  $("#cur-code").textContent = curSeq ? curSeq.letters + " " + curSeq.digits : "";

  $("#cur-code").hidden = !cur;

  function side(prefix, s, index) {
    var btn = $("#" + prefix + "-btn");

    btn.disabled = !s;

    var pair = s ? names(s.name, s.jp) : ["", ""];

    $("#" + prefix + "-jp").textContent = pair[0];

    $("#" + prefix + "-en").textContent = pair[1];

    /* Badge like a station number sign: line letters over the number. */
    var badge = $("#" + prefix + "-num");

    var seq = s ? seqParts(s, index) : null;

    var digits = seq ? seq.digits : "";

    var letters = seq ? seq.letters : "";

    badge.textContent = "";

    if (letters) {
      badge.appendChild(document.createElement("small")).textContent = letters;
    }

    badge.appendChild(document.createElement("b")).textContent = digits;

    badge.hidden = !s;
  }

  var prevIdx = around ? (state.idx - 1 + l.length) % l.length : state.idx - 1;

  var nextIdx = around ? (state.idx + 1) % l.length : state.idx + 1;

  side("prev", prev, prevIdx);

  side("next", next, nextIdx);
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

  if (n > 1 && line().shape === "loop") {
    /* Loop line: wrap around instead of stopping at the ends. */
    state.idx = ((i % n) + n) % n;
  } else {
    state.idx = Math.max(0, Math.min(i, n - 1));
  }

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
