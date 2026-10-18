// The one language setting (EN / 日本語) for the whole website.
//
// Everything that shows text reads the language from here, and every switch
// button writes to it, so the top bar, the station sheet, the map, the search
// and the line list always agree. The choice is remembered in the browser and
// follows the visitor to other tabs.
//
//   t(key, vars)      fixed website text from i18n-dict.js
//   pick(en, jp)      text from the database: Japanese when the switch is on
//                     日本語 and it was filled in, otherwise the English text
//   names(en, jp)     [main, sub] for a bilingual title
//   onLangChange(fn)  run fn whenever the language changes

import { DICT } from "./i18n-dict.js";

var KEY = "tokyo-lang";

var current = "en";
var listeners = [];

function clean(value) {
  return value === "jp" || value === "ja" ? "jp" : "en";
}

function filled(value) {
  return value != null && String(value).trim() !== "";
}

export function getLang() {
  return current;
}

export function isJp() {
  return current === "jp";
}

/* Fixed website text. Falls back to English, then to the key itself. */
export function t(key, vars) {
  var text = (DICT[current] && DICT[current][key]) || DICT.en[key] || key;

  if (vars) {
    Object.keys(vars).forEach(function (name) {
      text = text.split("{" + name + "}").join(vars[name]);
    });
  }

  return text;
}

/* Database text: the Japanese version when it exists, else the English one. */
export function pick(en, jp) {
  return current === "jp" && filled(jp) ? jp : en;
}

/* [main, sub]: the visitor's language first, the other as a helper line. */
export function names(en, jp) {
  var has = filled(jp);

  if (current === "jp") {
    return has ? [jp, en] : [en, ""];
  }

  return [en, has ? jp : ""];
}

/* Fill the fixed text in the page markup:
 *   data-i18n="key"                         -> text content
 *   data-i18n-attr="aria-label:key;title:k" -> attributes
 */
export function applyStatic(root) {
  root = root || document;

  root.querySelectorAll("[data-i18n]").forEach(function (node) {
    node.textContent = t(node.dataset.i18n);
  });

  root.querySelectorAll("[data-i18n-attr]").forEach(function (node) {
    node.dataset.i18nAttr.split(";").forEach(function (pair) {
      var at = pair.indexOf(":");

      if (at > 0) {
        node.setAttribute(pair.slice(0, at).trim(), t(pair.slice(at + 1).trim()));
      }
    });
  });
}

function apply() {
  var html = document.documentElement;

  html.lang = current === "jp" ? "ja" : "en";
  html.setAttribute("data-lang", current);

  applyStatic();

  document.querySelectorAll("[data-set-lang]").forEach(function (button) {
    button.setAttribute("aria-pressed", String(button.dataset.setLang === current));
  });
}

export function onLangChange(fn) {
  listeners.push(fn);
}

export function setLang(next) {
  next = clean(next);

  if (next === current) {
    return;
  }

  current = next;

  try {
    localStorage.setItem(KEY, current);
  } catch (e) {}

  apply();

  listeners.forEach(function (fn) {
    fn(current);
  });
}

export function initLang() {
  var saved = null;

  try {
    saved = localStorage.getItem(KEY);
  } catch (e) {}

  current = clean(saved);

  apply();

  /* Every switch button in the page: <button data-set-lang="en|jp"> */
  document.addEventListener("click", function (e) {
    var button = e.target.closest ? e.target.closest("[data-set-lang]") : null;

    if (button) {
      setLang(button.dataset.setLang);
    }
  });

  /* The language was changed in another tab of the site. */
  window.addEventListener("storage", function (e) {
    if (e.key === KEY && e.newValue) {
      setLang(e.newValue);
    }
  });
}
