// The lines picker dialog.

import { data } from "./data.js";
import { dlg, toggle } from "./dom.js";
import { setLine } from "./navigation.js";
import { state } from "./state.js";
import { $ } from "./utils.js";

function openLines() {
  dlg.hidden = false;

  toggle.setAttribute("aria-expanded", "true");

  dlg.scrollTop = 0;

  $("#lines-back").focus();
}

export function closeLines() {
  dlg.hidden = true;

  toggle.setAttribute("aria-expanded", "false");

  toggle.focus();
}

export function markActiveRow() {
  document.querySelectorAll(".line-row").forEach(function (r) {
    r.classList.toggle(
      "active",
      Number(r.getAttribute("data-i")) === state.lineIdx,
    );
  });
}

function buildLinesDialog() {
  var groups = [];

  var byOp = {};

  data.lines.forEach(function (l, i) {
    var key = l.operatorId;

    if (!byOp[key]) {
      byOp[key] = {
        id: key,

        name: l.operator || "Other",

        items: [],
      };

      groups.push(byOp[key]);
    }

    byOp[key].items.push({
      l: l,
      i: i,
    });
  });

  groups.sort(function (a, b) {
    return a.id - b.id;
  });

  $("#lines-sub").textContent =
    data.lines.length +
    " routes — " +
    groups
      .map(function (g) {
        return g.name;
      })
      .join(", ");

  var host = $("#lines-groups");

  host.innerHTML = "";

  groups.forEach(function (g) {
    g.items.sort(function (a, b) {
      return a.l.id - b.l.id;
    });

    var sec = document.createElement("section");

    sec.className = "lines-group";

    var head = document.createElement("div");

    head.className = "lines-group-head";

    head.innerHTML = "<span></span><em></em>";

    head.firstChild.textContent = g.name;

    head.lastChild.textContent =
      g.items.length + (g.items.length === 1 ? " line" : " lines");

    sec.appendChild(head);

    g.items.forEach(function (it) {
      var row = document.createElement("button");

      row.type = "button";

      row.className = "line-row";

      row.setAttribute("data-i", it.i);

      row.innerHTML =
        '<span class="line-badge"></span>' +
        '<span class="line-text">' +
        "<b></b>" +
        "<small></small>" +
        "</span>" +
        '<svg class="line-chevron" viewBox="0 0 24 24">' +
        '<path d="M9 6l6 6-6 6"></path>' +
        "</svg>";

      var badge = row.querySelector(".line-badge");

      badge.textContent = it.l.code || "";

      badge.style.background = it.l.color;

      var name = row.querySelector("b");

      name.textContent = it.l.name;

      name.style.setProperty("--c", it.l.color);

      row.querySelector("small").textContent = it.l.description || "";

      row.addEventListener("click", function () {
        setLine(it.i);

        closeLines();
      });

      sec.appendChild(row);
    });

    host.appendChild(sec);
  });

  markActiveRow();
}

export function initLinesDialog() {
  buildLinesDialog();
  toggle.addEventListener("click", openLines);
  $("#lines-back").addEventListener("click", closeLines);
}
