// Escape key closes whatever is open.

import { dlg, overlay, sheet } from "./dom.js";
import { closeLines, closeSoon, isSoonOpen } from "./lines-dialog.js";
import { closeSearch } from "./search.js";
import { closeSheet } from "./station-sheet.js";

export function initEscapeKey() {
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") {
      return;
    }

    if (isSoonOpen()) {
      closeSoon();
    } else if (!sheet.hidden) {
      closeSheet();
    } else if (!dlg.hidden) {
      closeLines();
    } else if (!overlay.hidden) {
      closeSearch();
    }
  });
}
