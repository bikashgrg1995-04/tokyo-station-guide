// Moved as-is from src/pages/admin/lines/[id]/edit.astro

const editForm =
  document.getElementById(
    "edit-line-form",
  );

const saveDialog =
  document.getElementById(
    "save-line-dialog",
  );

const saveButton =
  document.getElementById(
    "save-line-button",
  );

if (
  editForm instanceof HTMLFormElement &&
  saveDialog instanceof HTMLDivElement &&
  saveButton instanceof HTMLButtonElement
) {
  let confirmed = false;

  editForm.addEventListener(
    "submit",
    (event) => {
      if (confirmed) {
        return;
      }

      if (!editForm.checkValidity()) {
        return;
      }

      event.preventDefault();

      const nameInput =
        document.getElementById("name");

      const nameElement =
        saveDialog.querySelector(
          ".common-dialog-name",
        );

      if (
        nameInput instanceof HTMLInputElement &&
        nameElement instanceof HTMLElement
      ) {
        nameElement.textContent =
          nameInput.value.trim();
      }

      saveDialog.dispatchEvent(
        new CustomEvent("dialog:open"),
      );
    },
  );

  saveDialog.addEventListener(
    "confirm",
    () => {
      confirmed = true;

      editForm.submit();
    },
  );
}

export {};
