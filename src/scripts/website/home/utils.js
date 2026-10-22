// Small DOM / string helpers.

const NS = "http://www.w3.org/2000/svg";

export const $ = function (s) {
  return document.querySelector(s);
};

export function el(name, attrs, parent) {
  var n = document.createElementNS(NS, name);

  for (var k in attrs) {
    n.setAttribute(k, attrs[k]);
  }

  if (parent) {
    parent.appendChild(n);
  }

  return n;
}

export function num(code) {
  var m = String(code || "").match(/(\d+)\s*$/);

  return m ? m[1] : "";
}

/*
 * Accepts: array of strings, array of {name|label|title},
 * JSON string, or comma / newline separated string.
 */
export function toList(v) {
  if (!v) {
    return [];
  }

  if (typeof v === "string") {
    var t = v.trim();

    if (t.charAt(0) === "[") {
      try {
        return toList(JSON.parse(t));
      } catch (e) {}
    }

    return t
      .split(/[,\n]/)
      .map(function (s) {
        return s.trim();
      })
      .filter(Boolean);
  }

  if (Array.isArray(v)) {
    return v
      .map(function (i) {
        return typeof i === "string"
          ? i.trim()
          : String((i && (i.name || i.label || i.title)) || "").trim();
      })
      .filter(Boolean);
  }

  return [];
}

export function esc(v) {
  return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c];
  });
}

/* Base address for uploaded R2 files. Empty = served by this site (/media);
   set MEDIA_BASE_URL (R2 custom domain) to serve them without the Worker. */
export function mediaSrc(key) {
  var meta = document.querySelector('meta[name="media-base"]');
  var base = ((meta && meta.content) || "/media").replace(/\/+$/, "");

  return base + "/" + key;
}
