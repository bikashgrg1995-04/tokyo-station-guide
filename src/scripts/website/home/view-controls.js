// Zoom, pan and touch gestures.

import { svg } from "./dom.js";
import { state } from "./state.js";
import { $ } from "./utils.js";

/*
 * Every viewBox change goes through here: it is written once per frame (touch
 * events can fire faster than the screen refreshes) and never when unchanged.
 */
var pendingBox = null;
var lastBox = "";
var flushing = false;

function writeBox(value) {
  pendingBox = value;

  if (flushing) {
    return;
  }

  flushing = true;

  requestAnimationFrame(function () {
    flushing = false;

    if (pendingBox !== null && pendingBox !== lastBox) {
      lastBox = pendingBox;

      svg.setAttribute("viewBox", pendingBox);
    }

    pendingBox = null;
  });
}

export function setView(p) {
  var vw = state.VB.w / state.zoom;

  var vh = state.VB.h / state.zoom;

  var fx = state.VB.x + state.VB.w / 2;

  var fy = state.VB.y + state.VB.h / 2;

  /*
   * When zoomed in, follow train.
   */

  if (state.zoom > 1 && p) {
    fx = p.x;
    fy = p.y;
  }

  var x = Math.min(Math.max(fx - vw / 2, state.VB.x), state.VB.x + state.VB.w - vw);

  var y = Math.min(Math.max(fy - vh / 2, state.VB.y), state.VB.y + state.VB.h - vh);

  writeBox(x + " " + y + " " + vw + " " + vh);
}

const MAX_ZOOM = 6;

/*
 * The map is drawn with "meet": it keeps its shape and may leave empty
 * margins. These two helpers convert between screen pixels and map
 * coordinates for a given viewBox (x, y, w, h).
 */
function screenScale(rect, vw, vh) {
  return Math.min(rect.width / vw, rect.height / vh);
}

function worldAt(clientX, clientY, vb) {
  var rect = svg.getBoundingClientRect();

  var k = screenScale(rect, vb[2], vb[3]);

  return {
    x: vb[0] + (clientX - rect.left - (rect.width - vb[2] * k) / 2) / k,
    y: vb[1] + (clientY - rect.top - (rect.height - vb[3] * k) / 2) / k,
  };
}

function currentViewBox() {
  /* Include a change that is queued for the next frame. */
  return (pendingBox !== null ? pendingBox : svg.getAttribute("viewBox"))
    .split(" ")
    .map(Number);
}

/*
 * Zoom so that the map point `anchor` stays exactly under the screen
 * position (clientX, clientY): the pointer on a computer, the fingers on
 * a phone.
 */
function zoomAround(zoom, anchor, clientX, clientY) {
  var rect = svg.getBoundingClientRect();

  if (!rect.width || !rect.height) {
    return;
  }

  state.zoom = Math.min(MAX_ZOOM, Math.max(1, zoom));

  var vw = state.VB.w / state.zoom;

  var vh = state.VB.h / state.zoom;

  var k = screenScale(rect, vw, vh);

  var x = anchor.x - (clientX - rect.left - (rect.width - vw * k) / 2) / k;

  var y = anchor.y - (clientY - rect.top - (rect.height - vh * k) / 2) / k;

  x = Math.min(Math.max(x, state.VB.x), state.VB.x + state.VB.w - vw);

  y = Math.min(Math.max(y, state.VB.y), state.VB.y + state.VB.h - vh);

  writeBox(x + " " + y + " " + vw + " " + vh);
}

const pan = {
  active: false,

  startX: 0,
  startY: 0,

  startVBX: 0,
  startVBY: 0,
};

/*
 * Convert screen movement into SVG/world movement.
 */
function panBy(dx, dy) {
  var rect = svg.getBoundingClientRect();

  if (!rect.width || !rect.height) {
    return;
  }

  var vw = state.VB.w / state.zoom;

  var vh = state.VB.h / state.zoom;

  var k = screenScale(rect, vw, vh);

  var worldDX = dx / k;

  var worldDY = dy / k;

  var x = pan.startVBX - worldDX;

  var y = pan.startVBY - worldDY;

  x = Math.min(Math.max(x, state.VB.x), state.VB.x + state.VB.w - vw);

  y = Math.min(Math.max(y, state.VB.y), state.VB.y + state.VB.h - vh);

  writeBox(x + " " + y + " " + vw + " " + vh);
}

const touches = {
  mode: null,

  startX: 0,
  startY: 0,

  startVBX: 0,
  startVBY: 0,

  distance: 0,

  zoomStart: 1,

  anchor: { x: 0, y: 0 },
};

function touchDistance(t) {
  return Math.hypot(
    t[0].clientX - t[1].clientX,

    t[0].clientY - t[1].clientY,
  );
}

export function initViewControls() {
  /*
   * iOS Safari zooms the whole page on pinch (gesture events) even with
   * touch-action set. Block it everywhere so only the map zoom applies.
   */
  ["gesturestart", "gesturechange", "gestureend"].forEach(function (name) {
    document.addEventListener(
      name,
      function (e) {
        e.preventDefault();
      },
      { passive: false },
    );
  });

  /*
   * Mouse wheel zoom.
   */
  $("#stage").addEventListener(
    "wheel",
    function (e) {
      e.preventDefault();

      /* A trackpad pinch arrives as a ctrl + wheel with small steps. */
      var step = e.deltaMode === 1 ? 0.05 : e.ctrlKey ? 0.01 : 0.0015;

      var anchor = worldAt(e.clientX, e.clientY, currentViewBox());

      zoomAround(
        state.zoom * Math.exp(-e.deltaY * step),
        anchor,
        e.clientX,
        e.clientY,
      );
    },
    {
      passive: false,
    },
  );
  $("#stage").addEventListener("mousedown", function (e) {
    if (e.button !== 0) {
      return;
    }

    /*
     * At zoom 1 the whole map is fitted.
     */

    if (state.zoom <= 1) {
      return;
    }

    pan.active = true;

    pan.startX = e.clientX;

    pan.startY = e.clientY;

    var viewBox = currentViewBox();

    pan.startVBX = viewBox[0];

    pan.startVBY = viewBox[1];

    $("#stage").classList.add("is-panning");
  });
  window.addEventListener("mousemove", function (e) {
    if (!pan.active) {
      return;
    }

    panBy(
      e.clientX - pan.startX,

      e.clientY - pan.startY,
    );
  });
  window.addEventListener("mouseup", function () {
    if (!pan.active) {
      return;
    }

    pan.active = false;

    $("#stage").classList.remove("is-panning");
  });
  /*
   * One finger = pan.
   * Two fingers = pinch.
   */
  $("#stage").addEventListener(
    "touchstart",
    function (e) {
      if (e.touches.length === 1) {
        if (state.zoom <= 1) {
          return;
        }

        touches.mode = "pan";

        touches.startX = e.touches[0].clientX;

        touches.startY = e.touches[0].clientY;

        var viewBox = currentViewBox();

        touches.startVBX = viewBox[0];

        touches.startVBY = viewBox[1];

        $("#stage").classList.add("is-panning");
      }

      if (e.touches.length === 2) {
        touches.mode = "pinch";

        touches.distance = touchDistance(e.touches);

        touches.zoomStart = state.zoom;

        /* The map point between the fingers stays between the fingers. */
        touches.anchor = worldAt(
          (e.touches[0].clientX + e.touches[1].clientX) / 2,
          (e.touches[0].clientY + e.touches[1].clientY) / 2,
          currentViewBox(),
        );

        $("#stage").classList.remove("is-panning");
      }
    },
    {
      passive: true,
    },
  );
  $("#stage").addEventListener(
    "touchmove",
    function (e) {
      /*
       * Pinch.
       */

      if (touches.mode === "pinch" && e.touches.length === 2) {
        e.preventDefault();

        var distance = touchDistance(e.touches);

        if (!touches.distance) {
          return;
        }

        zoomAround(
          touches.zoomStart * (distance / touches.distance),
          touches.anchor,
          (e.touches[0].clientX + e.touches[1].clientX) / 2,
          (e.touches[0].clientY + e.touches[1].clientY) / 2,
        );

        return;
      }

      /*
       * Pan.
       */

      if (touches.mode === "pan" && e.touches.length === 1 && state.zoom > 1) {
        e.preventDefault();

        pan.startX = touches.startX;

        pan.startY = touches.startY;

        pan.startVBX = touches.startVBX;

        pan.startVBY = touches.startVBY;

        panBy(
          e.touches[0].clientX - touches.startX,

          e.touches[0].clientY - touches.startY,
        );
      }
    },
    {
      passive: false,
    },
  );
  $("#stage").addEventListener(
    "touchend",
    function (e) {
      if (e.touches.length === 0) {
        touches.mode = null;

        $("#stage").classList.remove("is-panning");

        return;
      }

      /*
       * If pinch finishes with one finger,
       * start fresh pan.
       */

      if (e.touches.length === 1) {
        if (state.zoom <= 1) {
          touches.mode = null;

          return;
        }

        touches.mode = "pan";

        touches.startX = e.touches[0].clientX;

        touches.startY = e.touches[0].clientY;

        var viewBox = currentViewBox();

        touches.startVBX = viewBox[0];

        touches.startVBY = viewBox[1];

        $("#stage").classList.add("is-panning");
      }
    },
    {
      passive: true,
    },
  );
  $("#stage").addEventListener(
    "touchcancel",
    function () {
      touches.mode = null;

      $("#stage").classList.remove("is-panning");
    },
    {
      passive: true,
    },
  );
}
