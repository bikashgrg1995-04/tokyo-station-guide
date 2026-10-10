// List page: delete confirmation and auto search
import { initializeDeleteConfirm } from "./shared/delete-confirm";
import { initializeAutoSearch } from "../common/auto-search";

const initializeDeleteButtons = initializeDeleteConfirm({
  dialogId: "delete-operator-dialog",
  formId: "delete-operator-form",
  buttonSelector: ".js-delete-operator",
  idKey: "operatorId",
  nameKey: "operatorName",
  actionFor: (id) => `/admin/operators/${id}/delete`,
});

initializeAutoSearch({
  inputId: "operator-search",
  formId: "operator-search-form",
  contentId: "operators-table-content",
  debounceMs: 350,
  onContentUpdated: initializeDeleteButtons,
});

export {};
