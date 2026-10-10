// Edit page: ask for confirmation before saving
import { initializeSaveConfirm } from "./shared/save-confirm";

initializeSaveConfirm({
  formId: "edit-facility-form",
  dialogId: "save-facility-dialog",
  buttonId: "save-facility-button",
});

export {};