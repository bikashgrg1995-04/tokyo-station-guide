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
initScrollSpy();

onLangChange(function () {
  applyPicks();
  applyDates();
});
