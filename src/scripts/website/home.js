// Home page entry: loads the modules and wires everything up.
// The order of the calls below is the same as the original single file.

import { initTheme } from "./home/theme.js";
import { initStationSelect } from "./home/station-lookup.js";
import { initStationSheet } from "./home/station-sheet.js";
import { initBoardButtons, initKeyboardNav, selectInitialLine } from "./home/navigation.js";
import { initViewControls } from "./home/view-controls.js";
import { initLinesDialog } from "./home/lines-dialog.js";
import { initSearch } from "./home/search.js";
import { initEscapeKey } from "./home/escape-key.js";

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
