export interface SaveConfirmOptions {
  /** id of the edit form. */
  formId: string;
  /** id of the confirm dialog (ConfirmDialog component). */
  dialogId: string;
  /** id of the save button. */
  buttonId: string;
  /** id of the input whose value is shown in the dialog. */
  nameInputId?: string;
}

/**
 * Asks for confirmation before an edit form is submitted.
 * Invalid forms are left alone so the browser can show its own messages.
 */
export function initializeSaveConfirm(options: SaveConfirmOptions): void {
  const { formId, dialogId, buttonId, nameInputId = "name" } = options;

  const editForm = document.getElementById(formId);
  const saveDialog = document.getElementById(dialogId);
  const saveButton = document.getElementById(buttonId);

  if (
    !(editForm instanceof HTMLFormElement) ||
    !(saveDialog instanceof HTMLDivElement) ||
    !(saveButton instanceof HTMLButtonElement)
  ) {
    return;
  }

  let confirmed = false;

  editForm.addEventListener("submit", (event) => {
    if (confirmed) {
      return;
    }

    if (!editForm.checkValidity()) {
      return;
    }

    event.preventDefault();

    const nameInput = document.getElementById(nameInputId);
    const nameElement = saveDialog.querySelector(".common-dialog-name");

    if (
      nameInput instanceof HTMLInputElement &&
      nameElement instanceof HTMLElement
    ) {
      nameElement.textContent = nameInput.value.trim();
    }

    saveDialog.dispatchEvent(new CustomEvent("dialog:open"));
  });

  saveDialog.addEventListener("confirm", () => {
    confirmed = true;

    editForm.submit();
  });
}
