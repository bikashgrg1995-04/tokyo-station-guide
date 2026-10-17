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
 * One car, drawn top-down. Every measurement is a fraction of the car
 * width (w) or length (len), so the design scales with the map.
 *
 * k:
 * 0 = leading car (dark domed cab, headlamps)
 * 1 = middle
 * 2 = last car (dark cab, tail lamps)
 */

/* Rounded-rectangle outline with a separate radius for each end. */
function shellPath(x0, y0, x1, y1, rt, rb) {
  return (
    "M" + x0 + "," + (y0 + rt) +
    " Q" + x0 + "," + y0 + " " + (x0 + rt) + "," + y0 +
    " L" + (x1 - rt) + "," + y0 +
    " Q" + x1 + "," + y0 + " " + x1 + "," + (y0 + rt) +
    " L" + x1 + "," + (y1 - rb) +
    " Q" + x1 + "," + y1 + " " + (x1 - rb) + "," + y1 +
    " L" + (x0 + rb) + "," + y1 +
    " Q" + x0 + "," + y1 + " " + x0 + "," + (y1 - rb) +
    " Z"
  );
}

function buildCar(k, len, w, gap) {
  var g = el("g", { class: "train-car" }, $("#train"));

  var hw = w / 2;
  var h = len / 2;

  var rEnd = w * 0.17; // corner radius where cars meet
  var rCap = w * 0.3; // corner radius of the cab ends
  var rt = k === 0 ? rCap : rEnd;
  var rb = k === 2 ? rCap : rEnd;
  var capH = len * 0.17; // height of the dark cab cap

  /*
   * Coupling: a slim dark bridge sitting in the gap behind the next car.
   */

  if (k < 2) {
    el(
      "rect",
      {
        x: -w * 0.31,
        y: h - 0.4,
        width: w * 0.62,
        height: gap + 0.8,
        rx: 0.4,
        class: "joint",
      },
      g,
    );
  }

  /*
   * Body shell.
   */

  el(
    "path",
    { d: shellPath(-hw, -h, hw, h, rt, rb), class: "car-body" },
    g,
  );

  /*
   * Usable run of the roof/side, between the cabs and the car ends.
   */

  var st0 = k === 0 ? -h + capH : -h + len * 0.036;
  var st1 = k === 2 ? h - capH : h - len * 0.036;

  /*
   * Faint vertical panel grooves either side of the AC units.
   */

  [-0.3, -0.255, 0.255, 0.3].forEach(function (f) {
    el(
      "line",
      {
        x1: f * w,
        x2: f * w,
        y1: st0 + len * 0.05,
        y2: st1 - len * 0.05,
        "stroke-width": 0.25,
        class: "car-groove",
      },
      g,
    );
  });

  /*
   * Two line-colour stripes, one down each side.
   */

  var sw = w * 0.062;

  [-0.385, 0.385].forEach(function (f) {
    el(
      "rect",
      {
        x: f * w - sw / 2,
        y: st0,
        width: sw,
        height: st1 - st0,
        rx: sw / 2,
        class: "car-stripe",
      },
      g,
    );
  });

  /*
   * Glazing: a dashed light-blue run hugging the right edge.
   */

  el(
    "line",
    {
      x1: w * 0.468,
      x2: w * 0.468,
      y1: st0 + len * 0.045,
      y2: st1 - len * 0.04,
      "stroke-width": w * 0.058,
      "stroke-linecap": "round",
      "stroke-dasharray": len * 0.05 + " " + len * 0.075,
      class: "car-glaze",
    },
    g,
  );

  /*
   * Roof air-conditioning: two rounded housings, each with a
   * louvred (vertical-slat) grille.
   */

  [0.225, 0.518].forEach(function (f) {
    var oy = -h + len * f;
    var oh = len * 0.27;
    var ow = w * 0.43;

    el(
      "rect",
      {
        x: -ow / 2,
        y: oy,
        width: ow,
        height: oh,
        rx: ow * 0.2,
        class: "ac",
      },
      g,
    );

    var iw = w * 0.28;
    var ih = oh * 0.64;
    var iy = oy + oh * 0.19;

    el(
      "rect",
      {
        x: -iw / 2,
        y: iy,
        width: iw,
        height: ih,
        rx: w * 0.04,
        class: "ac-in",
      },
      g,
    );

    for (var i = 1; i <= 5; i++) {
      var lx = -iw / 2 + (iw * i) / 6;

      el(
        "line",
        {
          x1: lx,
          x2: lx,
          y1: iy + 0.5,
          y2: iy + ih - 0.5,
          "stroke-width": 0.28,
          class: "ac-line",
        },
        g,
      );
    }
  });

  /*
   * Front cab: dark dome with two headlamps.
   */

  if (k === 0) {
    el(
      "path",
      {
        d:
          "M" + -hw + "," + (-h + capH) +
          " L" + -hw + "," + (-h + rCap) +
          " Q" + -hw + "," + -h + " " + (-hw + rCap) + "," + -h +
          " L" + (hw - rCap) + "," + -h +
          " Q" + hw + "," + -h + " " + hw + "," + (-h + rCap) +
          " L" + hw + "," + (-h + capH) +
          " Z",
        class: "cab",
      },
      g,
    );

    [-1, 1].forEach(function (sx) {
      el(
        "circle",
        {
          cx: sx * w * 0.28,
          cy: -h + capH * 0.22,
          r: w * 0.07,
          class: "lamp",
        },
        g,
      );
    });
  }

  /*
   * Rear cab: dark cap with two tail lamps.
   */

  if (k === 2) {
    el(
      "path",
      {
        d:
          "M" + -hw + "," + (h - capH) +
          " L" + -hw + "," + (h - rCap) +
          " Q" + -hw + "," + h + " " + (-hw + rCap) + "," + h +
          " L" + (hw - rCap) + "," + h +
          " Q" + hw + "," + h + " " + hw + "," + (h - rCap) +
          " L" + hw + "," + (h - capH) +
          " Z",
        class: "cab",
      },
      g,
    );

    [-1, 1].forEach(function (sx) {
      el(
        "circle",
        {
          cx: sx * w * 0.28,
          cy: h - capH * 0.27,
          r: w * 0.075,
          class: "tail",
        },
        g,
      );
    });
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

  var gap = 1.4;

  var carLen = (total - gap * 2) / 3;

  /*
   * Cars are ~2.6x longer than wide, capped so two lanes never touch.
   */

  var carW = Math.max(11, Math.min(16, carLen / 2.6));

  state.carPitch = carLen + gap;

  state.carEls = [
    buildCar(0, carLen, carW, gap),
    buildCar(1, carLen, carW, gap),
    buildCar(2, carLen, carW, gap),
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

  var lamp = carW * 0.28;

  [-1, 1].forEach(function (sx) {
    el(
      "polygon",
      {
        points:
          sx * (lamp + 0.9) +
          "," +
          y0 +
          " " +
          sx * (lamp - 1.3) +
          "," +
          y0 +
          " " +
          sx * (lamp + 3.2) +
          "," +
          (y0 - LIGHT_REACH) +
          " " +
          sx * (lamp + 12.2) +
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
