export interface SubmitConfirmOptions {
  /** id of the form. */
  formId: string;
  /** id of the confirm dialog (ConfirmDialog component). */
  dialogId: string;
}

/** Asks for confirmation before the form is submitted. */
export function initializeSubmitConfirm(options: SubmitConfirmOptions): void {
  const { formId, dialogId } = options;

  const form = document.getElementById(formId);
  const dialog = document.getElementById(dialogId);

  if (
    !(form instanceof HTMLFormElement) ||
    !(dialog instanceof HTMLDivElement)
  ) {
    return;
  }

  let confirmed = false;

  form.addEventListener("submit", (event) => {
    if (confirmed) {
      return;
    }

    event.preventDefault();

    dialog.dispatchEvent(new CustomEvent("dialog:open"));
  });

  dialog.addEventListener("confirm", () => {
    confirmed = true;

    form.submit();
  });
}
