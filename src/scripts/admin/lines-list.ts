// List page: delete confirmation and auto search
import { initializeDeleteConfirm } from "./shared/delete-confirm";
import { initializeAutoSearch } from "../auto-search";

const initializeDeleteButtons = initializeDeleteConfirm({
  dialogId: "delete-line-dialog",
  formId: "delete-line-form",
  buttonSelector: ".js-delete-line",
  idKey: "lineId",
  nameKey: "lineName",
  actionFor: (id) => `/admin/lines/${id}/delete`,
});

initializeAutoSearch({
  inputId: "line-search",
  formId: "line-search-form",
  contentId: "lines-table-content",
  debounceMs: 350,
  onContentUpdated: initializeDeleteButtons,
});

export {};
