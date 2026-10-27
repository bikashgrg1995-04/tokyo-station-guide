
 // List page: delete confirmation and auto search
import { initializeDeleteConfirm } from "./shared/delete-confirm";
import { initializeAutoSearch } from "../common/auto-search";

const initializeDeleteButtons = initializeDeleteConfirm({
  dialogId: "delete-top-pick-dialog",
  formId: "delete-top-pick-form",
  buttonSelector: ".js-delete-top-pick",
  idKey: "topPickId",
  nameKey: "topPickName",
  actionFor: (id) => `/admin/places/${id}/delete`,
});

initializeAutoSearch({
  inputId: "top-pick-search",
  formId: "top-pick-search-form",
  contentId: "top-picks-table-content",
  debounceMs: 350,
  onContentUpdated: initializeDeleteButtons,
});

export {};
