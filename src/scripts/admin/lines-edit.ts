// Edit page: ask for confirmation before saving
import { initializeSaveConfirm } from "./shared/save-confirm";

initializeSaveConfirm({
  formId: "edit-line-form",
  dialogId: "save-line-dialog",
  buttonId: "save-line-button",
});

export {};
