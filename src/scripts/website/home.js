// Home page entry: loads the modules and wires everything up.
// The order of the calls below is the same as the original single file.

import { initLang, onLangChange } from "./home/i18n.js";
import { initTheme } from "./home/theme.js";
import { initStationSelect } from "./home/station-lookup.js";
import { initStationSheet, refreshSheetLanguage } from "./home/station-sheet.js";
import {
  initBoardButtons,
  initKeyboardNav,
  refreshLanguage,
  selectInitialLine,
} from "./home/navigation.js";
import { initViewControls } from "./home/view-controls.js";
import { initLinesDialog, refreshLinesDialog } from "./home/lines-dialog.js";
import { initSearch, refreshSearchLanguage } from "./home/search.js";
import { initEscapeKey } from "./home/escape-key.js";

/* The language comes first: everything below draws text in it. */
initLang();
initTheme();
initStationSelect();
initStationSheet();
initBoardButtons();
initViewControls();
initKeyboardNav();
initLinesDialog();
initSearch();
initEscapeKey();
selectInitialLine();

/* One switch, one value: when it changes, every part of the page redraws. */
onLangChange(function () {
  refreshLanguage();
  refreshLinesDialog();
  refreshSearchLanguage();
  refreshSheetLanguage();
});
