
 // Edit station page: facilities, floor filtering and confirmation before saving
import { initializeFacilityBulkSelect } from "./shared/facility-bulk-select";
import { initializeFacilityPicker } from "./shared/facility-picker";
import { initializeSubmitConfirm } from "./shared/submit-confirm";

function initializeFacilityFloorFilter(): void {
  const filter = document.querySelector(
    "#station-facility-floor-filter",
  ) as HTMLSelectElement | null;

  const tableBody = document.querySelector(
    "#station-facilities-body",
  ) as HTMLTableSectionElement | null;

  if (!filter || !tableBody) return;

  filter.addEventListener("change", () => {
    const selectedFloor = filter.value;

    const rows = tableBody.querySelectorAll(
      "tr[data-facility-row]",
    );

    rows.forEach((element) => {
      const row = element as HTMLTableRowElement;
      const floorId = row.dataset.floorId ?? "";

      row.hidden =
        selectedFloor !== "all" && floorId !== selectedFloor;
    });

    tableBody.dispatchEvent(
      new CustomEvent("facility-floor-filter-changed", {
        bubbles: true,
      }),
    );
  });
}

initializeFacilityFloorFilter();

initializeFacilityPicker();

initializeFacilityBulkSelect();

initializeSubmitConfirm({
  formId: "edit-station-form",
  dialogId: "edit-station-confirm-dialog",
});
