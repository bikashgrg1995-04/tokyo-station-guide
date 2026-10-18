// Featured stations in the search panel.

import { featuredStations, searchable } from "./data.js";
import { featuredHost, featuredSection } from "./dom.js";
import { names, pick } from "./i18n.js";
import { selectStationOnMap } from "./station-lookup.js";
import { esc } from "./utils.js";

/*
 * Featured items come from a different table/query than
 * `searchable`, so their slug may differ (case, spacing,
 * field name). Resolve it against `searchable` by slug,
 * then English name, then Japanese name.
 */
function resolveFeaturedSlug(f) {
  var norm = function (v) {
    return String(v || "")
      .trim()
      .toLowerCase();
  };

  var slug = norm(f.station_slug || f.slug);
  var name = norm(f.station_name || f.name);
  var jp = norm(f.station_name_japanese || f.jp);

  var hit = searchable.find(function (s) {
    return (
      (slug && norm(s.slug) === slug) ||
      (name && norm(s.name) === name) ||
      (jp && norm(s.jp) === jp)
    );
  });

  return hit ? hit.slug : null;
}

export function renderFeaturedStations() {
  featuredHost.innerHTML = "";

  if (!featuredStations.length) {
    featuredSection.hidden = true;

    return;
  }

  featuredSection.hidden = false;

  /* Uploaded photos are R2 keys served through /media; older rows hold a URL. */
  function featuredImageSrc(value) {
    var v = value == null ? "" : String(value);

    return v.indexOf("featured-station-images/") === 0 ? "/media/" + v : v;
  }

  featuredStations.forEach(function (station) {
    var a = document.createElement("a");

    var pair = names(station.station_name, station.station_name_japanese);

    var description = pick(
      station.description,
      station.description_japanese,
    );

    a.className = "featured-station";
    a.href = "#";
    a.dataset.slug = station.station_slug || "";

    a.innerHTML =
      '<span class="featured-image-wrap">' +
      '<img src="' +
      esc(featuredImageSrc(station.image_url)) +
      '" alt="" loading="lazy">' +
      "</span>" +
      '<span class="featured-info">' +
      "<b>" +
      esc(pair[0]) +
      (pair[1] ? " <em>" + esc(pair[1]) + "</em>" : "") +
      "</b>" +
      (description ? "<small>" + esc(description) + "</small>" : "") +
      "</span>";

    a.addEventListener("click", function (e) {
      e.preventDefault();

      var slug = resolveFeaturedSlug(station);

      if (!slug) {
        console.warn(
          "[featured] station not found in searchable:",
          station,
        );
        return;
      }

      /* selectStationOnMap also saves to Recent */
      selectStationOnMap(slug);
    });

    featuredHost.appendChild(a);
  });
}
