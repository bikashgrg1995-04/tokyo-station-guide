// List page: delete confirmation and auto search
import { initializeDeleteConfirm } from "./shared/delete-confirm";
import { initializeAutoSearch } from "../common/auto-search";

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

// Filter by line: reload the list with ?line=<id> (keeps the search term)
document
  .getElementById("station-line-filter")
  ?.addEventListener("change", (event) => {
    const select = event.target as HTMLSelectElement;
    const url = new URL(window.location.href);

    if (select.value) {
      url.searchParams.set("line", select.value);
    } else {
      url.searchParams.delete("line");
    }

    url.searchParams.delete("page");
    window.location.href = url.toString();
  });

export {};
