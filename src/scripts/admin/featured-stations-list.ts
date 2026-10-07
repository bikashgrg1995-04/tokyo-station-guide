// Moved as-is from src/pages/admin/featured-stations/index.astro

/* ========================================
   Delete Confirmation
======================================== */

const deleteDialog =
  document.getElementById(
    "delete-featured-station-dialog",
  );

const deleteForm =
  document.getElementById(
    "delete-featured-station-form",
  );

let selectedFeaturedId:
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
      ".js-delete-featured-station",
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
          const featuredId =
            button.dataset.featuredId;

          const stationName =
            button.dataset.stationName;

          if (
            !featuredId ||
            !stationName
          ) {
            return;
          }

          selectedFeaturedId =
            featuredId;

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
      if (!selectedFeaturedId) {
        return;
      }

      deleteForm.action =
        `/admin/featured-stations/${selectedFeaturedId}/delete`;

      deleteForm.submit();

      selectedFeaturedId = null;
    },
  );
}

initializeDeleteButtons();

export {};
