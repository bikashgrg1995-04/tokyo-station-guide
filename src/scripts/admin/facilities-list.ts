// List page: delete confirmation and auto search
import { initializeDeleteConfirm } from "./shared/delete-confirm";
import { initializeAutoSearch } from "../common/auto-search";

const initializeDeleteButtons = initializeDeleteConfirm({
  dialogId: "delete-facility-dialog",
  formId: "delete-facility-form",
  buttonSelector: ".js-delete-facility",
  idKey: "facilityId",
  nameKey: "facilityName",
  actionFor: (id) => `/admin/facilities/${id}/delete`,
});

initializeAutoSearch({
  inputId: "facility-search",
  formId: "facility-search-form",
  contentId: "facilities-table-content",
  debounceMs: 350,
  onContentUpdated: initializeDeleteButtons,
});

export {};