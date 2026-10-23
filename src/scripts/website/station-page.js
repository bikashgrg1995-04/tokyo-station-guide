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

/* Highlight the section that is on screen in the "On this page" list. */
function initScrollSpy() {
  var links = {};

  document.querySelectorAll("[data-toc-link]").forEach(function (a) {
    links[a.dataset.tocLink] = a;
  });

  var sections = document.querySelectorAll("[data-section]");

  if (!("IntersectionObserver" in window) || !sections.length) {
    return;
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) {
          return;
        }

        Object.keys(links).forEach(function (id) {
          links[id].classList.toggle("is-active", id === entry.target.dataset.section);
        });
      });
    },
    { rootMargin: "-80px 0px -65% 0px" },
  );

  sections.forEach(function (section) {
    observer.observe(section);
  });
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
