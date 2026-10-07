// Zoom, pan and touch gestures.

import { list, pointAt } from "./current-line.js";
import { svg } from "./dom.js";
import { go } from "./navigation.js";
import { state } from "./state.js";
import { $ } from "./utils.js";

function refreshView() {
  if (list().length) {
    setView(pointAt(state.trainS));
  }
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

  svg.setAttribute("viewBox", x + " " + y + " " + vw + " " + vh);
}

const MAX_ZOOM = 6;

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

  var worldDX = (dx / rect.width) * vw;

  var worldDY = (dy / rect.height) * vh;

  var x = pan.startVBX - worldDX;

  var y = pan.startVBY - worldDY;

  x = Math.min(Math.max(x, state.VB.x), state.VB.x + state.VB.w - vw);

  y = Math.min(Math.max(y, state.VB.y), state.VB.y + state.VB.h - vh);

  svg.setAttribute("viewBox", x + " " + y + " " + vw + " " + vh);
}

const touches = {
  mode: null,

  startX: 0,
  startY: 0,

  startVBX: 0,
  startVBY: 0,

  distance: 0,

  zoomStart: 1,
};

function touchDistance(t) {
  return Math.hypot(
    t[0].clientX - t[1].clientX,

    t[0].clientY - t[1].clientY,
  );
}

export function initViewControls() {
  $("#zoom-in").addEventListener("click", function () {
    state.zoom = Math.min(state.zoom * 1.5, MAX_ZOOM);

    refreshView();
  });
  $("#zoom-out").addEventListener("click", function () {
    state.zoom = Math.max(state.zoom / 1.5, 1);

    refreshView();
  });
  /*
   * Mouse wheel zoom.
   */
  $("#stage").addEventListener(
    "wheel",
    function (e) {
      e.preventDefault();

      var step = e.deltaMode === 1 ? 0.05 : 0.0015;

      state.zoom = Math.min(
        MAX_ZOOM,
        Math.max(1, state.zoom * Math.exp(-e.deltaY * step)),
      );

      refreshView();
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

    var viewBox = svg.getAttribute("viewBox").split(" ").map(Number);

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

        var viewBox = svg.getAttribute("viewBox").split(" ").map(Number);

        touches.startVBX = viewBox[0];

        touches.startVBY = viewBox[1];

        $("#stage").classList.add("is-panning");
      }

      if (e.touches.length === 2) {
        touches.mode = "pinch";

        touches.distance = touchDistance(e.touches);

        touches.zoomStart = state.zoom;

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

        state.zoom = Math.min(
          MAX_ZOOM,
          Math.max(1, touches.zoomStart * (distance / touches.distance)),
        );

        refreshView();

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

        var viewBox = svg.getAttribute("viewBox").split(" ").map(Number);

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
  $("#zoom-reset").addEventListener("click", function () {
    state.zoom = 1;

    go(0);
  });
}
