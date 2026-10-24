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

  function update() {
    ticking = false;

    var active = sections[0];

    sections.forEach(function (section) {
      if (section.getBoundingClientRect().top <= 110) {
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

initLang();
initTheme();
applyPicks();
applyDates();
applyCounts();
initScrollSpy();

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
