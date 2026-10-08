// Edit page: ask for confirmation before saving
import { initializeSaveConfirm } from "./shared/save-confirm";

initializeSaveConfirm({
  formId: "edit-operator-form",
  dialogId: "save-operator-dialog",
  buttonId: "save-operator-button",
});

export {};
