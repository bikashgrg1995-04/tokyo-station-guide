// The animated train.

import { list, pointAt, sOf } from "./current-line.js";
import { state } from "./state.js";
import { $, el } from "./utils.js";
import { setView } from "./view-controls.js";

const LANE_OFFSET = 8.7;

const LIGHT_REACH = 40;

const reduceMotion =
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/*
 * One car, drawn top-down.
 *
 * k:
 * 0 = leading car
 * 1 = middle
 * 2 = last
 */
function buildCar(k, len) {
  var g = el(
    "g",
    {
      class: "train-car",
    },
    $("#train"),
  );

  var h = len / 2;

  /*
   * Body: white shell with a soft grey rim and generously rounded ends.
   */

  el(
    "rect",
    {
      x: -7.5,
      y: -h,
      width: 15,
      height: len,
      rx: 4.2,
      class: "car-body",
    },
    g,
  );

  /*
   * Left side: solid line-colour band, running the full car.
   */

  el(
    "rect",
    {
      x: -6.7,
      y: -h + 4.5,
      width: 2.4,
      height: len - 9,
      rx: 1.1,
      class: "car-stripe",
    },
    g,
  );

  /*
   * Right side: one thin glazed strip, broken into door / window runs.
   */

  var wy0 = -h + 5;
  var wl = len - 10;
  var slots = 4;
  var slot = wl / slots;

  el(
    "line",
    {
      x1: 5.9,
      x2: 5.9,
      y1: wy0,
      y2: wy0 + wl,
      "stroke-dasharray": slot - 1.3 + " 1.3",
      class: "car-glaze",
    },
    g,
  );

  /*
   * Roof air-conditioning units: two big rounded panels per car.
   */

  var spots = k === 0 ? [0.3, 0.6] : k === 1 ? [0.16, 0.56] : [0.14, 0.44];

  spots.forEach(function (f) {
    var y = -h + len * f;

    var ph = len * 0.25;

    el(
      "rect",
      {
        x: -4.2,
        y: y,
        width: 8.4,
        height: ph,
        rx: 1.8,
        class: "ac",
      },
      g,
    );

    for (var i = 1; i <= 3; i++) {
      el(
        "rect",
        {
          x: -3.2,
          y: y + (ph * i) / 4 - 0.25,
          width: 6.4,
          height: 0.5,
          rx: 0.25,
          class: "ac-line",
        },
        g,
      );
    }
  });

  /*
   * Joints.
   */

  if (k > 0) {
    el(
      "rect",
      {
        x: -4.5,
        y: -h - 1.8,
        width: 9,
        height: 3.6,
        rx: 1.2,
        class: "joint",
      },
      g,
    );
  }

  if (k < 2) {
    el(
      "rect",
      {
        x: -4.5,
        y: h - 1.8,
        width: 9,
        height: 3.6,
        rx: 1.2,
        class: "joint",
      },
      g,
    );
  }

  /*
   * Front cab.
   */

  if (k === 0) {
    el(
      "path",
      {
        d:
          "M-7.5," +
          (-h + 8.5) +
          " L-7.5," +
          (-h + 4.2) +
          " Q-7.5," +
          -h +
          " -3.3," +
          -h +
          " L3.3," +
          -h +
          " Q7.5," +
          -h +
          " 7.5," +
          (-h + 4.2) +
          " L7.5," +
          (-h + 8.5) +
          " Z",
        class: "cab",
      },
      g,
    );

    el(
      "rect",
      {
        x: -4.6,
        y: -h + 3.6,
        width: 9.2,
        height: 3.2,
        rx: 1.4,
        class: "glass",
      },
      g,
    );

    el(
      "rect",
      {
        x: -3.2,
        y: -h + 4.2,
        width: 2.8,
        height: 0.6,
        rx: 0.3,
        class: "glint",
      },
      g,
    );

    el(
      "circle",
      {
        cx: -5.4,
        cy: -h + 1.7,
        r: 1.3,
        class: "lamp",
      },
      g,
    );

    el(
      "circle",
      {
        cx: 5.4,
        cy: -h + 1.7,
        r: 1.3,
        class: "lamp",
      },
      g,
    );
  }

  /*
   * Rear cab.
   */

  if (k === 2) {
    el(
      "path",
      {
        d:
          "M-7.5," +
          (h - 8.5) +
          " L-7.5," +
          (h - 4.2) +
          " Q-7.5," +
          h +
          " -3.3," +
          h +
          " L3.3," +
          h +
          " Q7.5," +
          h +
          " 7.5," +
          (h - 4.2) +
          " L7.5," +
          (h - 8.5) +
          " Z",
        class: "cab",
      },
      g,
    );

    el(
      "rect",
      {
        x: -4.6,
        y: h - 6.8,
        width: 9.2,
        height: 3.2,
        rx: 1.4,
        class: "glass",
      },
      g,
    );

    el(
      "circle",
      {
        cx: -5.4,
        cy: h - 1.7,
        r: 1.3,
        class: "tail",
      },
      g,
    );

    el(
      "circle",
      {
        cx: 5.4,
        cy: h - 1.7,
        r: 1.3,
        class: "tail",
      },
      g,
    );
  }

  return g;
}

export function initTrain() {
  $("#train").innerHTML = "";
  $("#glow").innerHTML = "";

  /*
   * Total train length follows station spacing.
   */

  var spacing = list().length > 1 ? Math.abs(sOf(1) - sOf(0)) : 60;

  var total = Math.max(50, Math.min(spacing * 1.68, 150));

  var gap = 3;

  var carLen = (total - gap * 2) / 3;

  state.carPitch = carLen + gap;

  state.carEls = [
    buildCar(0, carLen),
    buildCar(1, carLen),
    buildCar(2, carLen),
  ];

  /*
   * Headlight beam + glow.
   */

  state.glowEl = el(
    "g",
    {
      class: "headlight",
    },
    $("#glow"),
  );

  var y0 = -carLen / 2;

  [-1, 1].forEach(function (sx) {
    el(
      "polygon",
      {
        points:
          sx * 5.8 +
          "," +
          y0 +
          " " +
          sx * 3.6 +
          "," +
          y0 +
          " " +
          sx * 9 +
          "," +
          (y0 - LIGHT_REACH) +
          " " +
          sx * 18 +
          "," +
          (y0 - LIGHT_REACH),

        fill: "url(#beam-grad)",
      },
      state.glowEl,
    );
  });

  el(
    "ellipse",
    {
      cx: 0,
      cy: y0 - LIGHT_REACH * 0.62,
      rx: 13,
      ry: LIGHT_REACH * 0.58,
      fill: "url(#glow-grad)",
    },
    state.glowEl,
  );

  if (state.anim) {
    cancelAnimationFrame(state.anim);

    state.anim = null;
  }

  state.trainS = sOf(state.idx);
  state.trainLane = 1;
  state.trainDir = 1;

  drawTrain(state.trainS, state.trainLane, state.trainDir);
}

/*
 * Each car follows the track curve.
 */
function drawTrain(s, lane, dir) {
  for (var k = 0; k < 3; k++) {
    var p = pointAt(s + dir * (1 - k) * state.carPitch);

    var x = p.x + p.nx * lane * LANE_OFFSET;

    var y = p.y + p.ny * lane * LANE_OFFSET;

    var ang = (Math.atan2(dir * p.ny, dir * p.nx) * 180) / Math.PI;

    var t = "translate(" + x + " " + y + ") rotate(" + ang + ")";

    state.carEls[k].setAttribute("transform", t);

    if (k === 0) {
      state.glowEl.setAttribute("transform", t);
    }
  }

  return pointAt(s);
}

/*
 * Animate train from current position
 * to selected station.
 */
export function moveTrain() {
  var target = sOf(state.idx);

  var from = state.trainS;

  if (state.anim) {
    cancelAnimationFrame(state.anim);

    state.anim = null;
  }

  /*
   * Already there.
   */

  if (from === target) {
    setView(drawTrain(state.trainS, state.trainLane, state.trainDir));

    return;
  }

  var fromLane = state.trainLane;

  var toDir = target > from ? 1 : -1;

  state.trainDir = toDir;

  var dist = Math.abs(target - from);

  var dur = reduceMotion ? 0 : Math.min(1600, Math.max(500, dist * 1.8));

  /*
   * Reduced motion.
   */

  if (dur === 0) {
    state.trainS = target;

    state.trainLane = toDir;

    setView(drawTrain(state.trainS, state.trainLane, state.trainDir));

    return;
  }

  var t0 = performance.now();

  function step(now) {
    var k = Math.min(1, (now - t0) / dur);

    var e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;

    state.trainS = from + (target - from) * e;

    state.trainLane = fromLane + (toDir - fromLane) * Math.min(1, k * 3);

    setView(drawTrain(state.trainS, state.trainLane, state.trainDir));

    state.anim = k < 1 ? requestAnimationFrame(step) : null;
  }

  state.anim = requestAnimationFrame(step);
}
