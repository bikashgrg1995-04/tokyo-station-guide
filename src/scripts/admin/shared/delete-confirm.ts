export interface DeleteConfirmOptions {
  /** id of the confirm dialog (ConfirmDialog component). */
  dialogId: string;
  /** id of the hidden form that is submitted to delete the record. */
  formId: string;
  /** CSS selector of the delete buttons in the table. */
  buttonSelector: string;
  /** data attribute (camelCase) on the button that holds the record id. */
  idKey: string;
  /** data attribute (camelCase) on the button that holds the display name. */
  nameKey: string;
  /** URL the delete form posts to for a given id. */
  actionFor: (id: string) => string;
}

/**
 * Wires the "Delete" buttons of a list page to a confirm dialog and submits
 * the delete form after the user confirms.
 *
 * Returns the function that binds the buttons, so it can be called again
 * after the table content has been replaced (auto search).
 */
export function initializeDeleteConfirm(
  options: DeleteConfirmOptions,
): () => void {
  const { dialogId, formId, buttonSelector, idKey, nameKey, actionFor } =
    options;

  const deleteDialog = document.getElementById(dialogId);
  const deleteForm = document.getElementById(formId);

  let selectedId: string | null = null;

  const initializeDeleteButtons = () => {
    if (
      !(deleteDialog instanceof HTMLDivElement) ||
      !(deleteForm instanceof HTMLFormElement)
    ) {
      return;
    }

    document.querySelectorAll(buttonSelector).forEach((button) => {
      if (!(button instanceof HTMLButtonElement)) {
        return;
      }

      if (button.dataset.deleteInitialized === "true") {
        return;
      }

      button.dataset.deleteInitialized = "true";

      button.addEventListener("click", () => {
        const id = button.dataset[idKey];
        const name = button.dataset[nameKey];

        if (!id || !name) {
          return;
        }

        selectedId = id;

        const nameElement = deleteDialog.querySelector(".common-dialog-name");

        if (nameElement instanceof HTMLElement) {
          nameElement.textContent = name;
        }

        deleteDialog.dispatchEvent(new CustomEvent("dialog:open"));
      });
    });
  };

  if (
    deleteDialog instanceof HTMLDivElement &&
    deleteForm instanceof HTMLFormElement
  ) {
    deleteDialog.addEventListener("confirm", () => {
      if (!selectedId) {
        return;
      }

      deleteForm.action = actionFor(selectedId);

      deleteForm.submit();

      selectedId = null;
    });
  }

  initializeDeleteButtons();

  return initializeDeleteButtons;
}
