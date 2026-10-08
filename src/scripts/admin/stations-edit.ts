// Edit station page: facilities and confirmation before saving
import { initializeFacilityPicker } from "./shared/facility-picker";
import { initializeSubmitConfirm } from "./shared/submit-confirm";

initializeFacilityPicker();

initializeSubmitConfirm({
  formId: "edit-station-form",
  dialogId: "edit-station-confirm-dialog",
});
