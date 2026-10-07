// Moved as-is from src/pages/admin/stations/index.astro

import { initializeAutoSearch } from "../auto-search";

/* ========================================
   Delete Confirmation
======================================== */

const deleteDialog =
  document.getElementById(
    "delete-station-dialog",
  );

const deleteForm =
  document.getElementById(
    "delete-station-form",
  );

let selectedStationId:
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
      ".js-delete-station",
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
          const stationId =
            button.dataset.stationId;

          const stationName =
            button.dataset.stationName;

          if (
            !stationId ||
            !stationName
          ) {
            return;
          }

          selectedStationId =
            stationId;

          const nameElement =
            deleteDialog.querySelector(
              ".common-dialog-name",
            );

          if (
            nameElement instanceof HTMLElement
          ) {
            nameElement.textContent =
              stationName;
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
      if (!selectedStationId) {
        return;
      }

      deleteForm.action =
        `/admin/stations/${selectedStationId}/delete`;

      deleteForm.submit();

      selectedStationId = null;
    },
  );
}

initializeDeleteButtons();

/* ========================================
   Auto Search
======================================== */

initializeAutoSearch({
  inputId: "station-search",
  formId: "station-search-form",
  contentId: "stations-table-content",
  debounceMs: 350,
  onContentUpdated:
    initializeDeleteButtons,
});
