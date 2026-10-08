// List page: delete confirmation and auto search
import { initializeDeleteConfirm } from "./shared/delete-confirm";
import { initializeAutoSearch } from "../auto-search";

const initializeDeleteButtons = initializeDeleteConfirm({
  dialogId: "delete-station-dialog",
  formId: "delete-station-form",
  buttonSelector: ".js-delete-station",
  idKey: "stationId",
  nameKey: "stationName",
  actionFor: (id) => `/admin/stations/${id}/delete`,
});

initializeAutoSearch({
  inputId: "station-search",
  formId: "station-search-form",
  contentId: "stations-table-content",
  debounceMs: 350,
  onContentUpdated: initializeDeleteButtons,
});

export {};
