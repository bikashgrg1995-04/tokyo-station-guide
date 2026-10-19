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

/* Website status dropdown: choosing a value saves straight away (works after
   the list is refreshed by the search too, because it listens on the document). */
document.addEventListener("change", (event) => {
  const target = event.target;

  if (
    target instanceof HTMLSelectElement &&
    target.name === "website_status" &&
    target.closest(".admin-line-visibility-form")
  ) {
    target.form?.requestSubmit();
    // Disable only after the value has been captured by the submit.
    window.setTimeout(() => {
      target.disabled = true;
    }, 0);
  }
});

export {};
