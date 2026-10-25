// Hotels / restaurants list page: delete confirmation and auto search
import { initializeDeleteConfirm } from "./shared/delete-confirm";
import { initializeAutoSearch } from "../common/auto-search";

const route = document.getElementById("delete-place-form")?.dataset.route ?? "";

const initializeDeleteButtons = initializeDeleteConfirm({
  dialogId: "delete-place-dialog",
  formId: "delete-place-form",
  buttonSelector: ".js-delete-place",
  idKey: "placeId",
  nameKey: "placeName",
  actionFor: (id) => `/admin/${route}/${id}/delete`,
});

initializeAutoSearch({
  inputId: "place-search",
  formId: "place-search-form",
  contentId: "places-table-content",
  debounceMs: 350,
  onContentUpdated: initializeDeleteButtons,
});

export {};
