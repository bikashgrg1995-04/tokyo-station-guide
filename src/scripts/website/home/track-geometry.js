// Track shapes: straight, arc and the loop / hairpin builders.

/*
 * A track is a list of straight / arc segments.
 * Stations sit at distances along it.
 * Every point carries a normal pointing to the RIGHT
 * of travel.
 */
function segLine(x1, y1, x2, y2) {
  var len = Math.hypot(x2 - x1, y2 - y1);

  var tx = (x2 - x1) / len;
  var ty = (y2 - y1) / len;

  return {
    len: len,

    d: " L" + x2 + " " + y2,

    at: function (u) {
      return {
        x: x1 + tx * u,
        y: y1 + ty * u,
        tx: tx,
        ty: ty,
      };
    },
  };
}

function segArc(cx, cy, r, a0, a1) {
  var dir = a1 >= a0 ? 1 : -1;
  var len = Math.abs(a1 - a0) * r;

  var ex = cx + r * Math.cos(a1);
  var ey = cy + r * Math.sin(a1);

  return {
    len: len,

    d:
      " A" +
      r +
      " " +
      r +
      " 0 " +
      (len > Math.PI * r + 0.01 ? 1 : 0) +
      " " +
      (dir > 0 ? 1 : 0) +
      " " +
      ex +
      " " +
      ey,

    at: function (u) {
      var a = a0 + (dir * u) / r;

      return {
        x: cx + r * Math.cos(a),
        y: cy + r * Math.sin(a),
        tx: -dir * Math.sin(a),
        ty: dir * Math.cos(a),
      };
    },
  };
}

function makeTrack(segs, start, closed) {
  var length = 0;

  segs.forEach(function (sg) {
    length += sg.len;
  });

  var d =
    "M" +
    start.x +
    " " +
    start.y +
    segs
      .map(function (sg) {
        return sg.d;
      })
      .join("") +
    (closed ? " Z" : "");

  function raw(s) {
    var acc = 0;

    for (var i = 0; i < segs.length; i++) {
      if (s <= acc + segs[i].len || i === segs.length - 1) {
        return segs[i].at(Math.max(0, Math.min(s - acc, segs[i].len)));
      }

      acc += segs[i].len;
    }
  }

  return {
    closed: closed,
    length: length,
    d: d,

    pointAt: function (s) {
      var p;

      if (closed) {
        s = ((s % length) + length) % length;
        p = raw(s);
      } else if (s < 0) {
        p = raw(0);

        p = {
          x: p.x + p.tx * s,
          y: p.y + p.ty * s,
          tx: p.tx,
          ty: p.ty,
        };
      } else if (s > length) {
        p = raw(length);

        p = {
          x: p.x + p.tx * (s - length),
          y: p.y + p.ty * (s - length),
          tx: p.tx,
          ty: p.ty,
        };
      } else {
        p = raw(s);
      }

      p.nx = -p.ty;
      p.ny = p.tx;

      return p;
    },
  };
}

const CX = 400;

export function buildTrack(l, n) {
  var shape = l.shape || (n <= 8 ? "line" : "u");

  var t;

  if (shape === "loop") {
    /* Yamanote-style stadium loop */

    var R = 140;
    var S = 440;

    var rx = CX + R;
    var lx = CX - R;

    t = makeTrack(
      [
        segLine(rx, S, rx, 0),

        segArc(CX, 0, R, 0, -Math.PI),

        segLine(lx, 0, lx, S),

        segArc(CX, S, R, Math.PI, 0),
      ],
      {
        x: rx,
        y: S,
      },
      true,
    );

    t.sOf = function (i) {
      return S / 2 + (i / n) * t.length;
    };
  } else if (shape === "u") {
    /* Hairpin */

    var Ru = 100;

    var sp = n > 26 ? 50 : 64;

    var V = Math.max(80, (sp * (n - 1) - Math.PI * Ru) / 2);

    t = makeTrack(
      [
        segLine(CX - Ru, 0, CX - Ru, V),

        segArc(CX, V, Ru, Math.PI, 0),

        segLine(CX + Ru, V, CX + Ru, 0),
      ],
      {
        x: CX - Ru,
        y: 0,
      },
      false,
    );

    t.sOf = function (i) {
      return n > 1 ? (i * t.length) / (n - 1) : 0;
    };
  } else {
    /* Straight line */

    var len = Math.max(90, 90 * (n - 1));

    t = makeTrack(
      [segLine(CX, 0, CX, len)],
      {
        x: CX,
        y: 0,
      },
      false,
    );

    t.sOf = function (i) {
      return n > 1 ? (i * len) / (n - 1) : 0;
    };
  }

  t.shape = shape;

  return t;
}
