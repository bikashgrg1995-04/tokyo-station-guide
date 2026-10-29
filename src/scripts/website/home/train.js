// The animated train.

import { list, pointAt, sOf } from "./current-line.js";
import { state } from "./state.js";
import { $, el } from "./utils.js";
import { setView } from "./view-controls.js";

const LANE_OFFSET = 8.7;


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
      /* Bulb bloom around the lamp (dark theme only, see transit.css) */
      el(
        "circle",
        {
          cx: sx * w * 0.28,
          cy: -h + capH * 0.22,
          r: w * 0.4,
          fill: "url(#bulb-grad)",
          class: "bulb",
        },
        g,
      );

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

  /* Real cars are separated by a short gangway; this much room lets it bend on a curve. */
  var gap = 2.6;

  var carLen = (total - gap * 2) / 3;

  /*
   * Cars are ~2.6x longer than wide, capped so two lanes never touch.
   */

  var carW = Math.max(11, Math.min(16, carLen / 2.6));

  state.carPitch = carLen + gap;

  /* Flexible couplings: drawn first (under the cars), reshaped every frame so the
     train stays one connected piece on any curve. */
  state.carLen = carLen;
  state.carW = carW;
  state.jointEls = [0, 1].map(function () {
    return {
      body: el("path", { class: "joint" }, $("#train")),
      ribs: el("path", { class: "joint-ribs" }, $("#train")),
    };
  });

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

  /*
   * Headlight like the reference: one very wide, soft, cream-coloured pool of
   * light that starts at the nose and fades out far ahead (about 5 car-widths),
   * plus two short thin streaks from the lamps. Gradients only: no blur filter.
   */
  el(
    "ellipse",
    {
      cx: 0,
      cy: y0 - carW * 2.1,
      rx: carW * 4.4,
      ry: carW * 5.6,
      fill: "url(#glow-grad)",
    },
    state.glowEl,
  );

  [-1, 1].forEach(function (sx) {
    el(
      "polygon",
      {
        points:
          sx * (lamp + 0.5) + "," + y0 +
          " " + sx * (lamp - 0.5) + "," + y0 +
          " " + sx * (lamp - 0.2) + "," + (y0 - carW * 0.75) +
          " " + sx * (lamp + 0.2) + "," + (y0 - carW * 0.75),
        fill: "url(#beam-grad)",
      },
      state.glowEl,
    );
  });

  if (state.anim) {
    cancelAnimationFrame(state.anim);

    state.anim = null;
  }

  state.trainS = sOf(state.idx);
  state.trainLane = 1;
  state.trainDir = 1;

  drawTrain(state.trainS, state.trainLane, state.trainDir);
}

/* Point a fraction f of the way between two "x,y" strings. */
function mix(p, q, f) {
  var a = p.split(",");
  var b = q.split(",");

  return (
    (+a[0] + (b[0] - a[0]) * f).toFixed(2) + "," +
    (+a[1] + (b[1] - a[1]) * f).toFixed(2)
  );
}

/*
 * Each car follows the track curve.
 */
function drawTrain(s, lane, dir) {
  var poses = [];

  for (var k = 0; k < 3; k++) {
    var p = pointAt(s + dir * (1 - k) * state.carPitch);

    var x = p.x + p.nx * lane * LANE_OFFSET;

    var y = p.y + p.ny * lane * LANE_OFFSET;

    var rad = Math.atan2(dir * p.ny, dir * p.nx);

    var ang = (rad * 180) / Math.PI;

    var t = "translate(" + x + " " + y + ") rotate(" + ang + ")";

    state.carEls[k].setAttribute("transform", t);

    poses.push({ x: x, y: y, c: Math.cos(rad), s: Math.sin(rad) });

    if (k === 0) {
      state.glowEl.setAttribute("transform", t);
    }
  }

  /* Car-local point -> map point. */
  function world(pose, lx, ly) {
    return (
      (pose.x + lx * pose.c - ly * pose.s).toFixed(2) + "," +
      (pose.y + lx * pose.s + ly * pose.c).toFixed(2)
    );
  }

  /* Each coupling joins the rear corners of one car to the front corners of the
     next, so it bends with the track instead of leaving a gap on curves. */
  var h = state.carLen / 2;
  var jw = state.carW * 0.27; /* the gangway is narrower than the car, like the real thing */

  for (var j = 0; j < 2; j++) {
    var a = poses[j];
    var b = poses[j + 1];

    /* rear end of car a -> front end of car b (slightly inside both cars) */
    state.jointEls[j].body.setAttribute(
      "d",
      "M" + world(a, -jw, h - 1) + " L" + world(a, jw, h - 1) +
        " L" + world(b, jw, -h + 1) + " L" + world(b, -jw, -h + 1) + " Z",
    );

    /* bellows: three folds across the gangway, following the bend */
    var ribs = "";

    for (var r = 1; r <= 3; r++) {
      var f = r / 4;
      var ay = h - 1;

      ribs +=
        "M" + mix(world(a, -jw, ay), world(b, -jw, -h + 1), f) +
        " L" + mix(world(a, jw, ay), world(b, jw, -h + 1), f);
    }

    state.jointEls[j].ribs.setAttribute("d", ribs);
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

  /*
   * Loop line: the train keeps driving the same way round. Take the copy of
   * the target that is the shortest ride from here (so last -> first goes
   * across the seam instead of all the way back).
   */
  if (state.track.closed) {
    var L = state.track.length;

    var delta = (((target - from) % L) + L) % L;

    if (delta > L / 2) {
      delta -= L;
    }

    target = from + delta;
  }

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

  /* Start the clock on the first animation frame: Safari's frame timestamp
     is not always on the same clock as performance.now(). */
  var t0 = null;

  function step(now) {
    if (t0 === null) {
      t0 = now;
    }

    var k = Math.min(1, (now - t0) / dur);

    var e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;

    state.trainS = from + (target - from) * e;

    state.trainLane = fromLane + (toDir - fromLane) * Math.min(1, k * 3);

    setView(drawTrain(state.trainS, state.trainLane, state.trainDir));

    state.anim = k < 1 ? requestAnimationFrame(step) : null;
  }

  state.anim = requestAnimationFrame(step);
}
