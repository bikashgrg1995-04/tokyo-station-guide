// Dark / light theme.

import { $ } from "./utils.js";

function applyTheme(t) {
  document.documentElement.setAttribute("data-theme", t);

  try {
    localStorage.setItem("tokyo-theme", t);
  } catch (e) {}
}

export function initTheme() {
  try {
    var saved = localStorage.getItem("tokyo-theme");

    if (saved) {
      applyTheme(saved);
    }
  } catch (e) {}
  $("#theme-toggle").addEventListener("click", function () {
    applyTheme(
      document.documentElement.getAttribute("data-theme") === "dark"
        ? "light"
        : "dark",
    );
  });
}
