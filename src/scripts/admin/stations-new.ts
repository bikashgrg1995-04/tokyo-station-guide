// New station page: facilities and confirmation before creating
import { initializeFacilityPicker } from "./shared/facility-picker";
import { initializeSubmitConfirm } from "./shared/submit-confirm";

initializeFacilityPicker();

initializeSubmitConfirm({
  formId: "add-station-form",
  dialogId: "create-station-confirm-dialog",
});
