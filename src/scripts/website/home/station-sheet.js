// The station details sheet.

import { line as currentLine, list } from "./current-line.js";
import { data, searchable } from "./data.js";
import { sheet } from "./dom.js";
import { state } from "./state.js";
import { findLinesForStation } from "./station-lookup.js";
import { $, esc } from "./utils.js";

/*
 * Read a field from the line's station object first,
 * then from the matching searchable item.
 */
function stationField(stn, names) {
  var extra =
    searchable.find(function (s) {
      return s.slug === stn.slug;
    }) || {};

  for (var i = 0; i < names.length; i++) {
    var v = stn[names[i]];

    if (v == null || v === "") {
      v = extra[names[i]];
    }

    if (v != null && v !== "") {
      return v;
    }
  }

  return null;
}

/*
 * The sheet shows one station at a time.
 * sel stores the selected GROUP index, not the original row index.
 */
var view = {
  stn: null,
  tab: "facilities",
  lang: "en",
  sel: -1,
  platformSel: -1,
};

/* A JSON string (or array) from the page data, as an array. */
function parseList(raw) {
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch (e) {
      raw = null;
    }
  }

  return Array.isArray(raw)
    ? raw.filter(function (i) {
        return i && typeof i === "object";
      })
    : [];
}

/* Every line that stops at this station, for the badge row. */
function stationLines(stn) {
  var out = parseList(stationField(stn, ["connections"]))
    .filter(function (c) {
      return c.name;
    })
    .map(function (c) {
      return { name: c.name, code: c.code, color: c.color };
    });

  if (out.length) {
    return out;
  }

  findLinesForStation(stn.slug).forEach(function (m) {
    var line = data.lines[m.lineIndex];

    out.push({
      name: m.lineName,
      code: line.code,
      color: line.color,
    });
  });

  return out;
}

/* ---------- Facility icons ---------- */

var ICON_KEYS = {};

[
  "lockers",
  "storage",
  "tickets",
  "railpass",
  "touristinfo",
  "accessible",
  "atm",
  "exchange",
  "conveni",
  "taxi",
  "bus",
  "shinkansen",
  "police",
  "lost",
  "aid",
  "prayer",
  "rentcar",
  "gate",
  "wifi",
  "lift",
  "toilet",
  "baby",
  "dept",
  "pin",
].forEach(function (k) {
  ICON_KEYS[k] = true;
});

var ICON_RULES = [
  [/locker/, "lockers"],
  [/luggage|baggage|storage|parcel/, "storage"],
  [/rail.?pass|travel.?service/, "railpass"],
  [/ticket/, "tickets"],
  [/tourist|travel.?info|information/, "touristinfo"],
  [/wheelchair|accessible/, "accessible"],
  [/atm|bank/, "atm"],
  [/exchange|currency/, "exchange"],
  [/department|shopping/, "dept"],
  [/conveni|store|shop/, "conveni"],
  [/taxi/, "taxi"],
  [/bus/, "bus"],
  [/shinkansen|bullet/, "shinkansen"],
  [/police|koban/, "police"],
  [/lost/, "lost"],
  [/first.?aid|medical/, "aid"],
  [/nursing|baby/, "baby"],
  [/prayer/, "prayer"],
  [/rent.?a?.?car/, "rentcar"],
  [/gate/, "gate"],
  [/wi.?fi|wifi/, "wifi"],
  [/elevator|lift/, "lift"],
  [/toilet|restroom|washroom/, "toilet"],
];

function iconKey(f) {
  var icon = String(f.icon || "")
    .trim()
    .toLowerCase();

  if (ICON_KEYS[icon]) {
    return icon;
  }

  var hay = [icon, f.slug, f.name].join(" ").toLowerCase();

  for (var i = 0; i < ICON_RULES.length; i++) {
    if (ICON_RULES[i][0].test(hay)) {
      return ICON_RULES[i][1];
    }
  }

  return "pin";
}

function isDark() {
  var t = document.documentElement.dataset.theme;

  return (
    t === "dark" ||
    (t !== "light" &&
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
  );
}

function uploadedIconImg(key) {
  return (
    '<img class="ic ic-img" alt="" loading="lazy" src="/media/' +
    esc(key) +
    '">'
  );
}

function facilityIcon(f) {
  var icon = String(f.icon || "").trim();
  var darkIcon = String(f.icon_dark || "").trim();

  if (isDark() && darkIcon.indexOf("facility-icons/") === 0) {
    return uploadedIconImg(darkIcon);
  }

  if (icon.indexOf("facility-icons/") === 0) {
    return uploadedIconImg(icon);
  }

  if (icon && !ICON_KEYS[icon.toLowerCase()] && /[^\x00-\x7f]/.test(icon)) {
    return '<span class="ic ic-emoji">' + esc(icon) + "</span>";
  }

  return (
    '<svg class="ic" aria-hidden="true"><use href="#' +
    (isDark() ? "iosd-" : "ios-") +
    iconKey(f) +
    '"/></svg>'
  );
}

/* ---------- Small pieces ---------- */

var SOURCES = {
  n: ["not verified", "未確認"],
  w: ["walked", "歩いて確認"],
  s: ["JR sign", "JR案内表示"],
  o: ["seen on site", "現地で確認"],
};

function isJp() {
  return view.lang === "jp";
}

function sourceTag(v) {
  if (!v) {
    return "";
  }

  var label = SOURCES[v] ? SOURCES[v][isJp() ? 1 : 0] : String(v);

  return '<span class="tag">' + esc(label) + "</span>";
}

/* Exit chips: [{ name, name_jp, color }] or plain strings. */
function exitChips(list) {
  return parseExits(list)
    .map(function (e) {
      return (
        '<span class="ex"><i' +
        (e.color ? ' style="background:' + esc(e.color) + '"' : "") +
        "></i>" +
        esc(isJp() && e.name_jp ? e.name_jp : e.name) +
        "</span>"
      );
    })
    .join("");
}

function parseExits(raw) {
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch (e) {
      raw = null;
    }
  }

  return (Array.isArray(raw) ? raw : [])
    .map(function (e) {
      return typeof e === "string" ? { name: e } : e;
    })
    .filter(function (e) {
      return e && e.name;
    });
}

/* ---------- Facility grouping ---------- */

/*
 * Group records for display only.
 *
 * IMPORTANT:
 * If records have a shared facility ID, use it as the grouping key.
 * Otherwise, use a shared slug; finally, use the normalized name.
 * Original floor-wise records are never modified.
 */
function groupedFacilities(items) {
  var groups = [];
  var byKey = Object.create(null);

  items.forEach(function (f) {
    var name = String(f.name || "").trim();

    var id =
      f.facility_id != null
        ? f.facility_id
        : f.facilityId != null
          ? f.facilityId
          : null;

    var slug = String(f.slug || "")
      .trim()
      .toLowerCase();

    var key =
      id != null && id !== ""
        ? "id:" + String(id)
        : slug
          ? "slug:" + slug
          : "name:" + name.toLowerCase().replace(/\s+/g, " ");

    if (!byKey[key]) {
      byKey[key] = {
        key: key,
        name: name,
        icon: f.icon,
        icon_dark: f.icon_dark,
        slug: f.slug,
        floors: [],
      };

      groups.push(byKey[key]);
    }

    byKey[key].floors.push(f);
  });

  return groups;
}

/* Unique floor labels, preserving the order in the source data. */
function facilityFloorLabel(group) {
  var floors = [];

  group.floors.forEach(function (f) {
    var floor = String(f.floor || "").trim();

    if (floor && floors.indexOf(floor) === -1) {
      floors.push(floor);
    }
  });

  return floors.join(" · ");
}

function facilityCountLabel(count) {
  if (count == null || count === "") {
    return "";
  }

  return esc(count) + (Number(count) === 1 ? " unit" : " units");
}

/* ---------- Tab contents ---------- */

function facilitiesHtml(stn) {
  var items = parseList(stationField(stn, ["facilities"]));
  var groups = groupedFacilities(items);

  if (view.sel >= groups.length) {
    view.sel = -1;
  }

  var gridContent = groups.length
    ? '<div class="grid">' +
      groups
        .map(function (group, i) {
          var floors = facilityFloorLabel(group);

          return (
            '<button type="button" class="tile" data-n="' +
            i +
            '" aria-pressed="' +
            (view.sel === i) +
            '">' +
            facilityIcon(group.floors[0]) +
            "<b>" +
            esc(group.name) +
            "</b>" +
            (floors ? '<span class="fl">' + esc(floors) + "</span>" : "") +
            "</button>"
          );
        })
        .join("") +
      "</div>"
    : '<p class="sheet-empty">No facilities listed yet.</p>';

  return (
    '<div class="gwrap">' +
    '<div class="gw">' +
    gridContent +
    "</div>" +
    '<button type="button" class="more" id="sheet-more" aria-label="Scroll for more">' +
    '<svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M3.5 6l4.5 4.5L12.5 6"/>' +
    "</svg>" +
    "</button>" +
    "</div>" +
    '<div class="detail" id="sheet-detail">' +
    facilityDetailHtml(groups[view.sel]) +
    "</div>"
  );
}

/* One selected facility; show every floor record separately. */

/* One selected facility; show every floor record separately. */
function facilityDetailHtml(group) {
  if (!group) {
    return '<span class="hint">Tap an icon for detail.</span>';
  }

  var allExits = [];
  var floorDetails = [];
  var facilityNotes = [];
  var locations = [];

  group.floors.forEach(function (f) {
    parseExits(f.exits).forEach(function (exit) {
      var exists = allExits.some(function (item) {
        return item.id != null && item.id === exit.id;
      });

      if (!exists) {
        allExits.push(exit);
      }
    });

    var bits = [];

    if (f.floor) {
      bits.push("Floor " + esc(f.floor));
    }

    var count = facilityCountLabel(f.count);

    if (count) {
      bits.push(count);
    }

    var where = String(f.location_type || "").toLowerCase();

    if (where === "inside" || where === "outside") {
      if (locations.indexOf(where) === -1) {
        locations.push(where);
      }
    }

    var detail = bits.join(" · ");

    if (detail) {
      floorDetails.push(
        detail +
          (f.note && String(f.note).trim()
            ? " · " + esc(String(f.note).trim())
            : ""),
      );
    }
  });

  var exits = exitChips(allExits);

  var locationPills = locations
    .map(function (type) {
      var label =
        type === "inside"
          ? isJp()
            ? "駅構内"
            : "Inside"
          : isJp()
            ? "駅の外"
            : "Outside";

      return (
        '<span class="io pk-status pk-status-' +
        type +
        '">' +
        esc(label) +
        "</span>"
      );
    })
    .join("");

  /* The pill sits beside the nearby exits; alone when there are no exits. */
  var topRow = exits
    ? '<div class="facility-nearby-row">' +
      '<span class="near">Nearby Exit</span>' +
      '<div class="facility-nearby-exits">' +
      exits +
      locationPills +
      "</div>" +
      "</div>"
    : locationPills
      ? '<div class="facility-location-row">' + locationPills + "</div>"
      : "";

  return (
    '<div class="facility-floor-details">' +
    topRow +
    (floorDetails.length ? "<div>" + floorDetails.join(", ") + "</div>" : "") +
    "</div>"
  );
}

function platformsHtml(stn) {
  var items = parseList(stationField(stn, ["platforms"]));

  if (!items.length) {
    return '<p class="sheet-empty">No platform information yet.</p>';
  }

  var rows = items
    .map(function (p) {
      var title = p.destinations || "Platform " + (p.number || "");
      var sub = [p.line, p.location].filter(Boolean).join(" · ");

      return (
        '<div class="row platform-row">' +
        '<span class="l"><b>' +
        esc(title) +
        "</b>" +
        (sub ? "<small>" + esc(sub) + "</small>" : "") +
        "</span>" +
        '<span class="pf"' +
        (p.color ? ' style="background:' + esc(p.color) + '"' : "") +
        ">" +
        esc(p.number || "") +
        "</span>" +
        "</div>"
      );
    })
    .join("");

  return '<div class="platform-list">' + rows + "</div>";
}

/* ---------- Top Picks helpers ---------- */

function tokyoWeekday() {
  var weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    weekday: "short",
  }).format(new Date());

  return {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }[weekday];
}

function formatPickTime(value) {
  if (!value) {
    return "";
  }

  var match = String(value).match(/^(\d{1,2}):(\d{2})/);

  if (!match) {
    return String(value);
  }

  return String(match[1]).padStart(2, "0") + ":" + match[2];
}

function pickOpeningHours(raw) {
  var hours = parseList(raw);

  if (!hours.length) {
    return null;
  }

  var today = tokyoWeekday();

  var schedule = hours.find(function (item) {
    return Number(item.day_of_week) === today;
  });

  if (!schedule) {
    return null;
  }

  if (Number(schedule.is_closed) === 1) {
    return {
      hours: isJp() ? "定休日" : "Closed",
      lastEntry: "",
    };
  }

  if (!schedule.opening_time || !schedule.closing_time) {
    return null;
  }

  return {
    hours:
      formatPickTime(schedule.opening_time) +
      "–" +
      formatPickTime(schedule.closing_time),
    lastEntry: formatPickTime(schedule.last_entry_time),
  };
}

/* ---------- Top Picks ---------- */

/* Uploaded photos are R2 keys; older rows may hold a plain http(s) URL. */
function pickPhotoSrc(value) {
  var v = value == null ? "" : String(value).trim();

  if (v.indexOf("top-pick-images/") === 0) {
    return "/media/" + v;
  }

  return /^https?:\/\//i.test(v) ? v : "";
}

function picksHtml(stn) {
  var items = parseList(stationField(stn, ["top_picks", "topPicks"]));

  if (!items.length) {
    return '<p class="sheet-empty">No top picks yet.</p>';
  }

  var locationLabels = {
    inside: isJp() ? "駅構内" : "Inside",
    connected: isJp() ? "駅直結" : "Connected",
    outside: isJp() ? "駅の外" : "Outside",
  };

  return items
    .map(function (t) {
      var locationType = String(t.location_type || "").toLowerCase();

      var locationLabel = locationLabels[locationType] || "";

      var status = locationLabel
        ? '<span class="io pk-status pk-status-' +
          esc(locationType) +
          '">' +
          esc(locationLabel) +
          "</span>"
        : "";

      /* Exit name only, with its actual station exit color. */
      var exitName = isJp()
        ? t.exit_name_japanese || t.exit_name || ""
        : t.exit_name || "";

      var exit = exitName
        ? '<span class="pk-exit">' +
          '<i class="pk-exit-dot"' +
          (t.exit_color
            ? ' style="background-color:' + esc(t.exit_color) + '"'
            : "") +
          "></i>" +
          esc(exitName) +
          "</span>"
        : "";

      /* Walking time is shown only for outside locations. */
      var minutes =
        locationType === "outside" && t.minutes != null && t.minutes !== ""
          ? '<span class="pk-walk">' +
            esc(
              isJp()
                ? "徒歩約" + t.minutes + "分"
                : "About " + t.minutes + " min walk",
            ) +
            "</span>"
          : "";

      /* Google Maps button: only for a real http(s) link set in the admin. */
      var mapUrl = String(t.map_url || "").trim();

      var mapLink = /^https?:\/\//i.test(mapUrl)
        ? '<a class="pk-map" href="' +
          esc(mapUrl) +
          '" target="_blank" rel="noopener noreferrer">' +
          '<svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">' +
          '<path d="M8 .5A5.5 5.5 0 0 0 2.5 6c0 3.9 4.6 8.9 5.1 9.4a.6.6 0 0 0 .8 0c.5-.5 5.1-5.5 5.1-9.4A5.5 5.5 0 0 0 8 .5zm0 7.6a2.1 2.1 0 1 1 0-4.2 2.1 2.1 0 0 1 0 4.2z"/>' +
          "</svg>" +
          esc(isJp() ? "Googleマップで見る" : "View on Google Maps") +
          "</a>"
        : "";

      var travelRow =
        exit || minutes || mapLink
          ? '<div class="pk-travel">' + exit + minutes + mapLink + "</div>"
          : "";

      /* Build the information row in the required order. */
      var info = [];

      if (t.entry_fee != null && String(t.entry_fee).trim() !== "") {
        info.push(
          (isJp() ? "入場料: " : "Entry fee: ") + String(t.entry_fee).trim(),
        );
      }

      var schedule = pickOpeningHours(t.opening_hours);

      if (schedule && schedule.hours) {
        info.push((isJp() ? "営業時間: " : "Hours: ") + schedule.hours);
      }

      if (schedule && schedule.lastEntry) {
        info.push(
          (isJp() ? "最終入場: " : "Last entry: ") + schedule.lastEntry,
        );
      }

      /* Show Visitor Notes only; do not display Description. */
      if (t.notes != null && String(t.notes).trim() !== "") {
        info.push(String(t.notes).trim());
      }

      var infoHtml = info.length
        ? '<div class="pk-info">' + info.map(esc).join(" | ") + "</div>"
        : "";

      var photo = pickPhotoSrc(t.image_url);

      return (
        '<div class="pk' +
        (photo ? " has-photo" : "") +
        '">' +
        (photo
          ? '<img class="pk-photo" src="' +
            esc(photo) +
            '" alt="' +
            esc(isJp() && t.name_jp ? t.name_jp : t.name) +
            '" loading="lazy" decoding="async">'
          : "") +
        '<div class="pk-body">' +
        '<div class="pk-heading">' +
        '<b class="pk-name">' +
        esc(isJp() && t.name_jp ? t.name_jp : t.name) +
        "</b>" +
        status +
        "</div>" +
        travelRow +
        infoHtml +
        "</div>" +
        "</div>"
      );
    })
    .join("");
}

function verifiedText(stn) {
  var yes = Number(stationField(stn, ["is_verified"])) === 1;
  var at = stationField(stn, ["verified_at"]);

  if (!yes) {
    return { ok: false, html: "Not yet verified" };
  }

  var when = "";

  if (at) {
    var iso = /^\d{4}-\d{2}-\d{2}$/.test(at)
      ? at + "T00:00:00Z"
      : /[zZ]|[+-]\d\d:?\d\d$/.test(at)
        ? at
        : at.replace(" ", "T") + "Z";

    var d = new Date(iso);

    if (!isNaN(d.getTime())) {
      when = d.toLocaleDateString(isJp() ? "ja-JP" : "en-GB", {
        day: "numeric",
        month: isJp() ? "long" : "short",
        year: "numeric",
        timeZone: "UTC",
      });
    }
  }

  return {
    ok: true,
    html:
      "<b>✓ " +
      (isJp() ? "確認済み" : "Verified") +
      "</b>" +
      (when ? " " + esc(when) : ""),
  };
}

function renderNames() {
  var stn = view.stn;
  var jp = stn.jp || stn.name;
  var main = $("#sheet-main");
  var sub = $("#sheet-sub");

  if (isJp()) {
    main.textContent = jp;
    main.lang = "ja";
    sub.textContent = stn.name;
  } else {
    main.textContent = stn.name;
    main.lang = "en";
    sub.textContent = stn.jp || "";
  }

  var v = verifiedText(stn);
  var verified = $("#sheet-verified");

  verified.innerHTML = v.html;
  verified.classList.toggle("is-ok", v.ok);

  document.querySelectorAll(".sheet-lang button").forEach(function (b) {
    b.setAttribute("aria-pressed", String(b.dataset.lang === view.lang));
  });
}

/* Fade + chevron on the facility grid, depending on scroll position. */
function updateGridScroll() {
  var w = document.querySelector("#sheet-body .gw");
  var g = document.querySelector("#sheet-body .gwrap");

  if (!w || !g) {
    return;
  }

  g.classList.toggle("end", w.scrollTop + w.clientHeight >= w.scrollHeight - 4);
  g.classList.toggle("sc", w.scrollTop > 8);
}

function renderTab() {
  var stn = view.stn;
  var body = $("#sheet-body");
  var old = body.querySelector(".gw");
  var keep = old ? old.scrollTop : 0;

  /* Use grouped count to determine the grid height. */
  var many =
    view.tab === "facilities" &&
    groupedFacilities(parseList(stationField(stn, ["facilities"]))).length > 8;

  body.className =
    "sheet-body" +
    (view.tab === "facilities" ? " at" : "") +
    (many ? " tall" : "");

  body.innerHTML =
    view.tab === "platforms"
      ? platformsHtml(stn)
      : view.tab === "picks"
        ? picksHtml(stn)
        : facilitiesHtml(stn);

  var grid = body.querySelector(".gw");

  if (grid) {
    grid.scrollTop = keep;
  } else {
    body.scrollTop = 0;
  }

  updateGridScroll();

  var note = $("#sheet-note");
  var note = $("#sheet-note");

  note.textContent =
    "Icons appear only when the floor is checked. Unverified facts stay hidden.";

  note.hidden = false;

  document.querySelectorAll(".sheet-tabs button").forEach(function (b) {
    b.setAttribute("aria-selected", String(b.dataset.tab === view.tab));
  });
}

function selectFacility(button) {
  var n = Number(button.dataset.n);

  view.sel = view.sel === n ? -1 : n;
  renderTab();
}

function selectPlatform(button) {
  var n = Number(button.dataset.platform);

  view.platformSel = view.platformSel === n ? -1 : n;
  renderTab();
}

/* ---------- Suggestion form ---------- */

function prepareSuggestionForm(stn) {
  var form = $("#station-suggestion-form");
  var section = $("#sheet-edit-form");
  var button = $("#sheet-suggest-edit");
  var message = $("#suggestion-message");

  form.reset();

  $("#suggestion-station-id").value = stn.id != null ? String(stn.id) : "";

  var line = currentLine();

  $("#suggestion-line-id").value =
    line && line.id != null ? String(line.id) : "";

  section.hidden = true;
  button.setAttribute("aria-expanded", "false");

  $("#sheet-cancel-edit").textContent = "Cancel";

  message.textContent = "";
  message.hidden = true;
  message.classList.remove("is-success", "is-error");
}

/*
 * Title = station name, subtitle = the line the visitor was looking at.
 * Both are plain text: the visitor only writes the suggestion itself.
 */
function fillSuggestionHead() {
  var line = currentLine();

  $("#suggestion-title").textContent = $("#sheet-main").textContent;

  var sub = $("#suggestion-subtitle");

  if (line && line.name) {
    sub.innerHTML =
      '<span class="suggestion-line-dot"' +
      (line.color ? ' style="--c:' + esc(line.color) + '"' : "") +
      "></span>" +
      esc(line.name);
    sub.hidden = false;
  } else {
    sub.textContent = "";
    sub.hidden = true;
  }
}

function openSheet() {
  var stn = list()[state.idx];

  if (!stn) {
    return;
  }

  view.stn = stn;
  view.sel = -1;
  view.platformSel = -1;

  renderNames();

  /* Line badges */
  $("#sheet-lines").innerHTML = stationLines(stn)
    .map(function (l) {
      var text =
        l.code ||
        String(l.name || "")
          .slice(0, 2)
          .toUpperCase();

      return (
        '<span class="sheet-line" title="' +
        esc(l.name) +
        '"' +
        (l.color ? ' style="--c:' + esc(l.color) + '"' : "") +
        ">" +
        esc(text) +
        "</span>"
      );
    })
    .join("");

  /* Description */
  var desc = stationField(stn, ["about", "description", "summary"]);
  var descEl = $("#sheet-desc");

  descEl.textContent = desc || "";
  descEl.hidden = false;

  /* First tab that has something to show */
  var has = {
    facilities: parseList(stationField(stn, ["facilities"])).length,
    platforms: parseList(stationField(stn, ["platforms"])).length,
    picks: parseList(stationField(stn, ["top_picks", "topPicks"])).length,
  };

  view.tab = has.facilities
    ? "facilities"
    : has.platforms
      ? "platforms"
      : has.picks
        ? "picks"
        : "facilities";

  renderTab();

  prepareSuggestionForm(stn);

  sheet.hidden = false;

  updateGridScroll();

  $("#sheet-close").focus();
}

export function closeSheet() {
  sheet.hidden = true;
}

export function initStationSheet() {
  $("#info-link").addEventListener("click", function (e) {
    if (!list()[state.idx]) {
      return;
    }

    e.preventDefault();
    openSheet();
  });

  document.querySelectorAll(".sheet-tabs button").forEach(function (b) {
    b.addEventListener("click", function () {
      if (!view.stn) {
        return;
      }

      view.tab = b.dataset.tab;
      view.sel = -1;
      view.platformSel = -1;
      renderTab();
    });
  });

  document.querySelectorAll(".sheet-lang button").forEach(function (b) {
    b.addEventListener("click", function () {
      if (!view.stn) {
        return;
      }

      view.lang = b.dataset.lang;
      renderNames();
      renderTab();
    });
  });

  $("#sheet-body").addEventListener("click", function (e) {
    var target = e.target.closest ? e.target.closest("button") : null;

    if (!target) {
      return;
    }

    if (target.id === "sheet-more") {
      var w = document.querySelector("#sheet-body .gw");

      if (w) {
        w.scrollBy({ top: w.clientHeight * 0.7, behavior: "smooth" });
      }

      return;
    }

    if (target.classList.contains("tile")) {
      selectFacility(target);
      return;
    }

    if (target.classList.contains("platform-row")) {
      selectPlatform(target);
    }
  });

  /* Scroll events do not bubble, so listen in the capture phase. */
  $("#sheet-body").addEventListener(
    "scroll",
    function (e) {
      if (e.target.classList && e.target.classList.contains("gw")) {
        updateGridScroll();
      }
    },
    true,
  );

  window.addEventListener("resize", updateGridScroll);

  /* Redraw icons when the theme changes while the sheet is open. */
  new MutationObserver(function () {
    if (view.stn && !sheet.hidden) {
      renderTab();
    }
  }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  $("#sheet-suggest-edit").addEventListener("click", function () {
    var section = $("#sheet-edit-form");
    var button = $("#sheet-suggest-edit");
    var opening = section.hidden;

    section.hidden = !opening;
    button.setAttribute("aria-expanded", String(opening));

    if (opening) {
      fillSuggestionHead();

      $("#sheet-cancel-edit").textContent = "Cancel";

      section.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });

      $("#suggestion-text").focus();
    }
  });

  $("#sheet-cancel-edit").addEventListener("click", function () {
    $("#sheet-edit-form").hidden = true;
    $("#sheet-suggest-edit").setAttribute("aria-expanded", "false");

    var message = $("#suggestion-message");
    message.hidden = true;
    message.textContent = "";
    message.classList.remove("is-success", "is-error");
  });

  $("#station-suggestion-form").addEventListener(
    "submit",
    async function (event) {
      event.preventDefault();

      var form = event.currentTarget;
      var message = $("#suggestion-message");
      var submitButton = $("#sheet-submit-edit");

      if (submitButton.disabled) {
        return;
      }

      message.hidden = true;
      message.textContent = "";
      message.classList.remove("is-success", "is-error");

      submitButton.disabled = true;
      submitButton.textContent = "Submitting...";

      try {
        var response = await fetch("/api/station-suggestions", {
          method: "POST",
          body: new FormData(form),
          headers: {
            Accept: "application/json",
          },
        });

        var result = await response.json();

        if (!response.ok || !result.ok) {
          throw new Error(
            result.message ||
              "Unable to submit your suggestion. Please try again.",
          );
        }

        message.textContent =
          result.message ||
          "Thank you! Your suggestion has been sent for review.";
        message.classList.remove("is-error");
        message.classList.add("is-success");
        message.hidden = false;

        // Ready for another suggestion; the button now just closes the form.
        $("#suggestion-text").value = "";
        $("#sheet-cancel-edit").textContent = "Close";
      } catch (error) {
        message.textContent =
          error instanceof Error
            ? error.message
            : "A network error occurred. Please try again.";

        message.classList.remove("is-success");
        message.classList.add("is-error");
        message.hidden = false;
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Submit Suggestion";
      }
    },
  );

  $("#sheet-close").addEventListener("click", closeSheet);
  $("#sheet-backdrop").addEventListener("click", closeSheet);
}
