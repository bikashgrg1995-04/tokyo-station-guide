// Moved as-is from src/pages/admin/featured-stations/[id]/edit.astro

const editFeaturedStationForm = document.getElementById(
  "edit-featured-station-form",
);

const editFeaturedStationDialog = document.getElementById(
  "edit-featured-station-confirm-dialog",
);

if (
  editFeaturedStationForm instanceof HTMLFormElement &&
  editFeaturedStationDialog instanceof HTMLDivElement
) {
  let confirmed = false;

  editFeaturedStationForm.addEventListener("submit", (event) => {
    if (confirmed) {
      return;
    }

    event.preventDefault();

    editFeaturedStationDialog.dispatchEvent(
      new CustomEvent("dialog:open"),
    );
  });

  editFeaturedStationDialog.addEventListener("confirm", () => {
    confirmed = true;
    editFeaturedStationForm.submit();
  });
}

export {};
