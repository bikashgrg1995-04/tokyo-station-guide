// Moved as-is from src/pages/admin/lines/index.astro

import { initializeAutoSearch } from "../auto-search";

/* ========================================
   Delete Confirmation
======================================== */

const deleteDialog =
  document.getElementById(
    "delete-line-dialog",
  );

const deleteForm =
  document.getElementById(
    "delete-line-form",
  );

let selectedLineId:
  string | null = null;

const initializeDeleteButtons = () => {
  if (
    !(deleteDialog instanceof HTMLDivElement) ||
    !(deleteForm instanceof HTMLFormElement)
  ) {
    return;
  }

  const deleteButtons =
    document.querySelectorAll(
      ".js-delete-line",
    );

  deleteButtons.forEach(
    (button) => {
      if (
        !(button instanceof HTMLButtonElement)
      ) {
        return;
      }

      if (
        button.dataset
          .deleteInitialized === "true"
      ) {
        return;
      }

      button.dataset.deleteInitialized =
        "true";

      button.addEventListener(
        "click",
        () => {
          const lineId =
            button.dataset.lineId;

          const lineName =
            button.dataset.lineName;

          if (
            !lineId ||
            !lineName
          ) {
            return;
          }

          selectedLineId =
            lineId;

          const nameElement =
            deleteDialog.querySelector(
              ".common-dialog-name",
            );

          if (
            nameElement instanceof HTMLElement
          ) {
            nameElement.textContent =
              lineName;
          }

          deleteDialog.dispatchEvent(
            new CustomEvent(
              "dialog:open",
            ),
          );
        },
      );
    },
  );
};

if (
  deleteDialog instanceof HTMLDivElement &&
  deleteForm instanceof HTMLFormElement
) {
  deleteDialog.addEventListener(
    "confirm",
    () => {
      if (!selectedLineId) {
        return;
      }

      deleteForm.action =
        `/admin/lines/${selectedLineId}/delete`;

      deleteForm.submit();

      selectedLineId = null;
    },
  );
}

initializeDeleteButtons();

/* ========================================
   Auto Search
======================================== */

initializeAutoSearch({
  inputId: "line-search",
  formId: "line-search-form",
  contentId: "lines-table-content",
  debounceMs: 350,
  onContentUpdated:
    initializeDeleteButtons,
});
