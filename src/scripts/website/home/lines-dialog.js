// The line picker popover (opens above the board card) and the
// "Coming soon" dialog behind the Page button.

import { data } from "./data.js";
import { dlg, toggle } from "./dom.js";
import { setLine } from "./navigation.js";
import { state } from "./state.js";
import { $ } from "./utils.js";

function openLines() {
  dlg.hidden = false;
  toggle.setAttribute("aria-expanded", "true");
}

export function closeLines() {
  if (dlg.hidden) {
    return;
  }

  dlg.hidden = true;
  toggle.setAttribute("aria-expanded", "false");
}

export function markActiveRow() {
  document.querySelectorAll(".line-row[data-i]").forEach(function (r) {
    r.classList.toggle(
      "active",
      Number(r.getAttribute("data-i")) === state.lineIdx,
    );
  });
}

function buildLinesDialog() {
  var host = $("#lines-groups");

  host.innerHTML = "";

  data.lines.forEach(function (l, i) {
    var row = document.createElement("button");

    row.type = "button";
    row.className = "line-row";
    row.setAttribute("data-i", i);
    row.style.setProperty("--c", l.color);
    row.innerHTML =
      '<i class="line-dot"></i><b></b>' +
      '<svg class="line-check" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg>';
    row.querySelector("b").textContent = l.name;

    row.addEventListener("click", function () {
      setLine(i);
      closeLines();
    });

    host.appendChild(row);
  });

  (data.comingSoon || []).forEach(function (l) {
    var row = document.createElement("div");

    row.className = "line-row is-soon";
    row.style.setProperty("--c", l.color);
    row.innerHTML = '<i class="line-dot"></i><b></b><em>Coming soon</em>';
    row.querySelector("b").textContent = l.name;

    host.appendChild(row);
  });

  markActiveRow();
}

/* "Coming soon" dialog */
var soon = $("#soon-dialog");

export function openSoon() {
  soon.hidden = false;
  $("#soon-close").focus();
}

export function closeSoon() {
  if (soon.hidden) {
    return;
  }

  soon.hidden = true;
  $("#page-link").focus();
}

export function isSoonOpen() {
  return !soon.hidden;
}

export function initLinesDialog() {
  buildLinesDialog();

  toggle.addEventListener("click", function (e) {
    e.stopPropagation();

    if (dlg.hidden) {
      openLines();
    } else {
      closeLines();
    }
  });

  document.addEventListener("click", function (e) {
    if (!dlg.hidden && !dlg.contains(e.target)) {
      closeLines();
    }
  });

  $("#page-link").addEventListener("click", openSoon);
  $("#soon-close").addEventListener("click", closeSoon);
  $("#soon-backdrop").addEventListener("click", closeSoon);
}
