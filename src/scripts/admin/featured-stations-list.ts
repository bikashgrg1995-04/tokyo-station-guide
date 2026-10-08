// List page: delete confirmation
import { initializeDeleteConfirm } from "./shared/delete-confirm";

initializeDeleteConfirm({
  dialogId: "delete-featured-station-dialog",
  formId: "delete-featured-station-form",
  buttonSelector: ".js-delete-featured-station",
  idKey: "featuredId",
  nameKey: "stationName",
  actionFor: (id) => `/admin/featured-stations/${id}/delete`,
});

export {};
