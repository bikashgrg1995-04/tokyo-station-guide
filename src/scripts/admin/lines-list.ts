// List page: delete confirmation and auto search
import { initializeDeleteConfirm } from "./shared/delete-confirm";
import { initializeAutoSearch } from "../common/auto-search";

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

/* Website switch: flipping it saves straight away (works after the list
   is refreshed by the search too, because it listens on the document). */
document.addEventListener("change", (event) => {
  const target = event.target;

  if (target instanceof HTMLInputElement && target.matches(".js-line-visibility")) {
    target.disabled = true;
    target.form?.requestSubmit();
  }
});

export {};
