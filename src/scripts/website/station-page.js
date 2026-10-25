// Station page entry: language, theme and the table of contents.
// Uses the same language / theme settings as the map page (localStorage).

import { initLang, onLangChange, pick, t } from "./home/i18n.js";
import { initTheme } from "./home/theme.js";

/* Text from the database: [data-pick data-en="…" data-jp="…"] */
function applyPicks() {
  document.querySelectorAll("[data-pick]").forEach(function (node) {
    var text = pick(node.dataset.en || "", node.dataset.jp || "");

    if (text) {
      node.textContent = text;
    }
  });
}

/* Notes with **bold** (already escaped on the server): [data-pick-html data-en data-jp] */
function applyPickHtml() {
  document.querySelectorAll("[data-pick-html]").forEach(function (node) {
    var html = pick(node.dataset.en || "", node.dataset.jp || "");

    if (html) {
      node.innerHTML = html;
    }
  });
}

/* "Last updated {date}": fixed text with a date inside. */
function applyCounts() {
  document.querySelectorAll("[data-i18n-count]").forEach(function (node) {
    node.textContent =
      " " + t(node.dataset.i18nCount + (node.dataset.count === "1" ? "1" : ""));
  });
}

function applyDates() {
  document.querySelectorAll("[data-i18n-date]").forEach(function (node) {
    node.textContent = t(node.dataset.i18nDate, { date: node.dataset.date });
  });
}

/* Highlight the section that is under the header in the "On this page" list:
   the last section whose top has scrolled past the header. */
function initScrollSpy() {
  var links = {};

  document.querySelectorAll("[data-toc-link]").forEach(function (a) {
    links[a.dataset.tocLink] = a;
  });

  var sections = Array.prototype.slice.call(document.querySelectorAll("[data-section]"));

  if (!sections.length) {
    return;
  }

  var ticking = false;
  var lastShown = "";

  var header = document.querySelector(".sp-header");

  function syncHead() {
    if (header) {
      document.documentElement.style.setProperty("--sp-head", header.offsetHeight + "px");
    }
  }

  syncHead();
  window.addEventListener("resize", syncHead);

  function update() {
    ticking = false;

    var active = sections[0];

    sections.forEach(function (section) {
      if (section.getBoundingClientRect().top <= (header ? header.offsetHeight : 56) + 70) {
        active = section;
      }
    });

    /* Bottom of the page: the last section is the one being read. */
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
      active = sections[sections.length - 1];
    }

    Object.keys(links).forEach(function (id) {
      links[id].classList.toggle("is-active", id === active.dataset.section);
    });

    /* One-row menu on small screens: keep the active item centred. */
    var on = links[active.dataset.section];
    var row = on && on.parentElement;

    if (row && row.scrollWidth > row.clientWidth + 2 && lastShown !== active.dataset.section) {
      lastShown = active.dataset.section;
      row.scrollTo({
        left: on.offsetLeft - (row.clientWidth - on.offsetWidth) / 2,
        behavior: "smooth",
      });
    }
  }

  window.addEventListener(
    "scroll",
    function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    },
    { passive: true },
  );

  update();
}

/* "Which exit?": side tabs, exit chips and kind-of-place filter. All content is already in the page. */
function initWhichExit() {
  var root = document.querySelector("[data-wx]");

  if (!root) return;

  var sideBtns = Array.prototype.slice.call(root.querySelectorAll("[data-wx-side]"));
  var catBtns = Array.prototype.slice.call(root.querySelectorAll("[data-wx-cat]"));
  var places = Array.prototype.slice.call(root.querySelectorAll("[data-wx-place]"));
  var empty = root.querySelector("[data-wx-empty]");
  var state = { side: sideBtns.length ? sideBtns[0].dataset.wxSide : "0", exit: "", cat: "all" };

  function groupExits() {
    var group = root.querySelector('[data-wx-chips="' + state.side + '"]');
    var ids = [];

    if (group) {
      group.querySelectorAll("[data-wx-exit]").forEach(function (b) {
        ids.push(b.dataset.wxExit);
      });
    }

    return ids;
  }

  function render() {
    var sideExits = groupExits();
    var allowed = state.exit ? [state.exit] : sideExits;
    var shown = 0;

    sideBtns.forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.wxSide === state.side));
    });

    root.querySelectorAll("[data-wx-chips]").forEach(function (g) {
      g.hidden = g.dataset.wxChips !== state.side;
    });

    root.querySelectorAll("[data-wx-exit]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.wxExit === state.exit));
    });

    root.querySelectorAll("[data-wx-note]").forEach(function (n) {
      n.hidden = n.dataset.wxNote !== state.exit;
    });

    catBtns.forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.wxCat === state.cat));
    });

    places.forEach(function (li) {
      var ids = (li.dataset.exits || "").split(",");
      var catOk = state.cat === "all" || li.dataset.cat === state.cat;
      var hit = ids.some(function (id) {
        return allowed.indexOf(id) !== -1;
      });
      var show = catOk && hit;

      li.hidden = !show;

      if (show) {
        shown++;
        li.querySelectorAll("[data-wx-link]").forEach(function (l) {
          l.hidden = allowed.indexOf(l.dataset.wxLink) === -1;
        });
      }
    });

    if (empty) empty.hidden = shown > 0;
  }

  root.addEventListener("click", function (e) {
    var side = e.target.closest("[data-wx-side]");
    var exit = e.target.closest("[data-wx-exit]");
    var cat = e.target.closest("[data-wx-cat]");

    if (side) {
      state.side = side.dataset.wxSide;
      state.exit = "";
    } else if (exit) {
      state.exit = state.exit === exit.dataset.wxExit ? "" : exit.dataset.wxExit;
    } else if (cat) {
      state.cat = cat.dataset.wxCat;
    } else {
      return;
    }

    render();
  });

  render();
}

initLang();
initTheme();
applyPicks();
applyPickHtml();
applyDates();
applyCounts();
initScrollSpy();
initWhichExit();

/* Round "back to top" button: appears after the first screen, scrolls up on click. */
function initBackToTop() {
  var btn = document.getElementById("sp-top");

  if (!btn) return;

  function sync() {
    btn.hidden = window.scrollY < 400;
  }

  btn.addEventListener("click", function () {
    var calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    window.scrollTo({ top: 0, behavior: calm ? "auto" : "smooth" });
  });
  window.addEventListener("scroll", sync, { passive: true });
  sync();
}

initBackToTop();

onLangChange(function () {
  applyPicks();
  applyDates();
  applyCounts();
});

/* Along the line: switch line, and open neighbours (or say "not verified"). */
function initAlong() {
  var root = document.querySelector("[data-along]");
  var dialog = document.getElementById("soon-dialog");

  if (!root) {
    return;
  }

  if (!dialog) {
    return;
  }

  var title = document.getElementById("soon-title");
  var body = dialog.querySelector("p");
  var ok = document.getElementById("soon-close");

  function close() {
    dialog.hidden = true;
  }

  root.addEventListener("click", function (e) {
    var link = e.target.closest("a[data-verified='0']");

    if (!link) {
      return;
    }

    e.preventDefault();
    title.dataset.i18n = "soon.unverifiedTitle";
    body.dataset.i18n = "soon.unverifiedBody";
    title.textContent = t("soon.unverifiedTitle");
    body.textContent = t("soon.unverifiedBody");
    dialog.hidden = false;
    ok.focus();
  });

  ok.addEventListener("click", close);
  document.getElementById("soon-backdrop").addEventListener("click", close);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      close();
    }
  });
}

initAlong();
