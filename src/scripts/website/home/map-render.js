// Draws the map (track, stations, labels) into the SVG.

import { line, list } from "./current-line.js";
import { go } from "./navigation.js";
import { state } from "./state.js";
import { buildTrack } from "./track-geometry.js";
import { $, el } from "./utils.js";

const LABEL_LENS = [24, 42, 60];

export function drawMap() {
  var st = list();

  state.track = buildTrack(line(), st.length);

  document.documentElement.style.setProperty("--line", line().color);

  var trackG = $("#track");
  var labels = $("#labels");

  trackG.innerHTML = "";
  labels.innerHTML = "";

  el(
    "path",
    {
      d: state.track.d,
      class: "rail-bed",
    },
    trackG,
  );

  el(
    "path",
    {
      d: state.track.d,
      class: "rail-base",
    },
    trackG,
  );

  /*
   * Points along the track.
   * Labels must not cover them.
   */

  var samples = [];

  for (var q = 0; q <= state.track.length; q += 8) {
    samples.push(state.track.pointAt(q));
  }

  samples.push(state.track.pointAt(state.track.length));

  var rects = [];

  var box = {
    x0: Infinity,
    y0: Infinity,
    x1: -Infinity,
    y1: -Infinity,
  };

  function grow(x, y) {
    box.x0 = Math.min(box.x0, x);

    box.y0 = Math.min(box.y0, y);

    box.x1 = Math.max(box.x1, x);

    box.y1 = Math.max(box.y1, y);
  }

  samples.forEach(function (p) {
    grow(p.x - 10, p.y - 10);

    grow(p.x + 10, p.y + 10);
  });

  function hits(r) {
    var c = 0;

    rects.forEach(function (o) {
      if (
        r.x < o.x + o.w + 4 &&
        r.x + r.w + 4 > o.x &&
        r.y < o.y + o.h + 4 &&
        r.y + r.h + 4 > o.y
      ) {
        c++;
      }
    });

    samples.forEach(function (p) {
      if (
        p.x > r.x - 9 &&
        p.x < r.x + r.w + 9 &&
        p.y > r.y - 9 &&
        p.y < r.y + r.h + 9
      ) {
        c++;
      }
    });

    return c;
  }

  /*
   * Straight line:
   * labels right first.
   *
   * Loop / hairpin:
   * labels outside first.
   */

  var prefs = state.track.shape === "line" ? [-1, 1] : [1, -1];

  var probe = el(
    "text",
    {
      x: 0,
      y: 0,
      class: "label",
    },
    labels,
  );

  st.forEach(function (stn, i) {
    var p = state.track.pointAt(state.track.sOf(i));

    probe.textContent = stn.name;

    var bb = probe.getBBox();

    var best = null;

    LABEL_LENS.some(function (len) {
      return prefs.some(function (sd) {
        var dx = p.nx * sd;

        var dy = p.ny * sd;

        var ex = p.x + dx * len;

        var ey = p.y + dy * len;

        var anchor =
          dx > 0.35 ? "start" : dx < -0.35 ? "end" : "middle";

        var tx =
          ex + (anchor === "start" ? 9 : anchor === "end" ? -9 : 0);

        var ty = ey + (anchor === "middle" ? (dy < 0 ? -9 : 13) : 3.8);

        var left =
          tx +
          (anchor === "end"
            ? -bb.width
            : anchor === "middle"
              ? -bb.width / 2
              : 0);

        var c = {
          ex: ex,
          ey: ey,
          tx: tx,
          ty: ty,
          anchor: anchor,

          rect: {
            x: left - 8,
            y: ty + bb.y - 3,
            w: bb.width + 16,
            h: bb.height + 6,
          },
        };

        c.score = hits(c.rect);

        if (!best || c.score < best.score) {
          best = c;
        }

        return c.score === 0;
      });
    });

    rects.push(best.rect);

    grow(best.rect.x, best.rect.y);

    grow(best.rect.x + best.rect.w, best.rect.y + best.rect.h);

    var g = el(
      "g",
      {
        class: "stn",
        "data-i": i,
        tabindex: 0,
        role: "button",
        "aria-label": stn.name,
      },
      labels,
    );

    el(
      "line",
      {
        x1: p.x,
        y1: p.y,
        x2: best.ex,
        y2: best.ey,
        class: "leader",
      },
      g,
    );

    el(
      "circle",
      {
        cx: p.x,
        cy: p.y,
        r: 12,
        class: "halo",
      },
      g,
    );

    ["pulse pulse-1", "pulse pulse-2"].forEach(function (cls) {
      el("circle", { cx: p.x, cy: p.y, r: 9, class: cls }, g);
    });

    el(
      "circle",
      {
        cx: p.x,
        cy: p.y,
        r: 7,
        class: "stop-ring",
      },
      g,
    );

    el(
      "circle",
      {
        cx: p.x,
        cy: p.y,
        r: 4.2,
        class: "stop",
      },
      g,
    );

    el(
      "rect",
      {
        x: best.rect.x,
        y: best.rect.y,
        width: best.rect.w,
        height: best.rect.h,
        rx: best.rect.h / 2,
        ry: best.rect.h / 2,
        class: "pill",
      },
      g,
    );

    var text = el(
      "text",
      {
        x: best.tx,
        y: best.ty,
        "text-anchor": best.anchor,
        class: "label",
      },
      g,
    );

    text.textContent = stn.name;

    /*
     * Existing map station click.
     */

    g.addEventListener("click", function () {
      go(i);
    });

    g.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        go(i);
      }
    });
  });

  labels.removeChild(probe);

  /*
   * Zoom-1 view:
   * fit whole line.
   */

  var pad = 36;

  var vx = box.x0 - pad;

  var vy = box.y0 - pad;

  var vw = box.x1 - box.x0 + pad * 2;

  var vh = box.y1 - box.y0 + pad * 2;

  var mw = vw;

  var mh = vh;

  state.VB = {
    x: vx - (mw - vw) / 2,

    y: vy - (mh - vh) / 2,

    w: mw,
    h: mh,
  };
}
