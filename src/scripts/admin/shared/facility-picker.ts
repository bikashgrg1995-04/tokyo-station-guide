/**
 * Shared floor-wise facility picker for New Station and Edit Station.
 *
 * Supports:
 * - Adding the same facility on multiple floors.
 * - Quantity and optional notes for each floor entry.
 * - Removing one floor entry at a time.
 * - Updating empty states and modal selection counters.
 *
 * Database changes happen only when the station form is submitted.
 */
export function initializeFacilityPicker(): void {
  /* ========================================
     Elements
  ======================================== */

  const addFacilityModal = document.getElementById("add-facility-modal");

  const openAddFacilityButtons = document.querySelectorAll(
    "#open-add-facility-button, #open-add-facility-button-empty",
  );

  const closeAddFacilityButton = document.getElementById(
    "close-add-facility-modal",
  );

  const cancelAddFacilitiesButton = document.getElementById(
    "cancel-add-facilities",
  );

  const closeAddFacilityBackdrop = document.querySelector(
    "[data-close-add-facility-modal]",
  );

  const facilityCheckboxes = Array.from(
    document.querySelectorAll<HTMLInputElement>(".add-facility-checkbox"),
  );

  const selectedFacilityCount = document.getElementById(
    "selected-facility-count",
  );

  const addSelectedFacilitiesButton = document.getElementById(
    "add-selected-facilities",
  );

  const facilityBody = document.getElementById("station-facilities-body");

  const allFacilitiesMessage = document.getElementById(
    "all-facilities-message",
  );

  const removeFacilityDialog = document.getElementById(
    "remove-facility-confirm-dialog",
  );

  /* ========================================
     Facility Table Helpers
  ======================================== */

  function getFacilityRows(): HTMLTableRowElement[] {
    if (!(facilityBody instanceof HTMLTableSectionElement)) {
      return [];
    }

    return Array.from(
      facilityBody.querySelectorAll<HTMLTableRowElement>(
        "[data-facility-row]",
      ),
    );
  }

  function updateFacilityEmptyState(): void {
    if (!(facilityBody instanceof HTMLTableSectionElement)) {
      return;
    }

    const hasRows = getFacilityRows().length > 0;

    let emptyRow = document.getElementById("station-facilities-empty-row");

    if (hasRows) {
      emptyRow?.remove();
      return;
    }

    if (!(emptyRow instanceof HTMLTableRowElement)) {
      emptyRow = document.createElement("tr");
      emptyRow.id = "station-facilities-empty-row";

      const cell = document.createElement("td");
      cell.colSpan = 5;

      const message = document.createElement("div");
      message.className = "admin-feature-empty";
      message.textContent = "No facilities assigned.";

      cell.appendChild(message);
      emptyRow.appendChild(cell);
      facilityBody.appendChild(emptyRow);
    }
  }

  function updateAllFacilitiesMessage(): void {
    if (!(allFacilitiesMessage instanceof HTMLElement)) {
      return;
    }

    const options = document.querySelectorAll("[data-facility-option]");

    // A facility may be selected repeatedly for different floors.
    allFacilitiesMessage.hidden = options.length > 0;
  }

  function createInput(
    name: string,
    value: string,
    options: {
      type?: string;
      placeholder?: string;
      min?: string;
      step?: string;
      maxLength?: number;
      required?: boolean;
      ariaLabel: string;
    },
  ): HTMLInputElement {
    const input = document.createElement("input");

    input.type = options.type ?? "text";
    input.name = name;
    input.value = value;
    input.setAttribute("aria-label", options.ariaLabel);

    if (options.placeholder) {
      input.placeholder = options.placeholder;
    }

    if (options.min !== undefined) {
      input.min = options.min;
    }

    if (options.step !== undefined) {
      input.step = options.step;
    }

    if (options.maxLength !== undefined) {
      input.maxLength = options.maxLength;
    }

    if (options.required) {
      input.required = true;
    }

    return input;
  }

  function addFacilityToTable(
    facilityId: number,
    facilityName: string,
  ): void {
    if (!(facilityBody instanceof HTMLTableSectionElement)) {
      return;
    }

    if (!Number.isInteger(facilityId) || facilityId <= 0) {
      return;
    }

    const row = document.createElement("tr");

    row.setAttribute("data-facility-row", "");
    row.dataset.facilityId = String(facilityId);
    row.dataset.facilityName = facilityName;

    /* Facility name and ID */

    const nameCell = document.createElement("td");

    const nameElement = document.createElement("div");
    nameElement.className = "admin-line-name";
    nameElement.textContent = facilityName;

    const facilityIdInput = document.createElement("input");
    facilityIdInput.type = "hidden";
    facilityIdInput.name = "facility_entry_facility_id";
    facilityIdInput.value = String(facilityId);

    nameCell.appendChild(nameElement);
    nameCell.appendChild(facilityIdInput);

    /* Floor */

    const floorCell = document.createElement("td");

    const floorInput = createInput("facility_entry_floor", "", {
      placeholder: "e.g. B1, 1F, 2F",
      maxLength: 30,
      required: true,
      ariaLabel: `Floor for ${facilityName}`,
    });

    floorCell.appendChild(floorInput);

    /* Quantity */

    const countCell = document.createElement("td");

    const countInput = createInput("facility_entry_count", "1", {
      type: "number",
      min: "1",
      step: "1",
      required: true,
      ariaLabel: `Quantity of ${facilityName}`,
    });

    countCell.appendChild(countInput);

    /* Optional note */

    const noteCell = document.createElement("td");

    const noteInput = createInput("facility_entry_note", "", {
      placeholder: "Optional note",
      maxLength: 500,
      ariaLabel: `Note for ${facilityName}`,
    });

    noteCell.appendChild(noteInput);

    /* Remove action */

    const actionsCell = document.createElement("td");

    const actions = document.createElement("div");
    actions.className = "admin-table-actions";

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className =
      "admin-table-action admin-table-action-delete";

    removeButton.setAttribute("data-remove-facility", "");
    removeButton.dataset.facilityName = facilityName;
    removeButton.textContent = "Remove";

    actions.appendChild(removeButton);
    actionsCell.appendChild(actions);

    // Use appendChild for compatibility with older DOM typings.
    row.appendChild(nameCell);
    row.appendChild(floorCell);
    row.appendChild(countCell);
    row.appendChild(noteCell);
    row.appendChild(actionsCell);

    const emptyRow = document.getElementById(
      "station-facilities-empty-row",
    );

    if (emptyRow?.parentElement === facilityBody) {
      facilityBody.insertBefore(row, emptyRow);
    } else {
      facilityBody.appendChild(row);
    }

    updateFacilityEmptyState();
  }

  function removeFacilityRow(row: HTMLTableRowElement): void {
    // Remove only this floor entry, not every row for the facility.
    row.remove();
    updateFacilityEmptyState();
  }

  /* ========================================
     Facility Modal
  ======================================== */

  function updateSelectedFacilityCount(): void {
    if (!(selectedFacilityCount instanceof HTMLElement)) {
      return;
    }

    const selectedCount = facilityCheckboxes.filter(
      (checkbox) => checkbox.checked,
    ).length;

    selectedFacilityCount.textContent = `${selectedCount} ${
      selectedCount === 1 ? "facility" : "facilities"
    } selected`;

    if (addSelectedFacilitiesButton instanceof HTMLButtonElement) {
      addSelectedFacilitiesButton.disabled = selectedCount === 0;
    }
  }

  function openAddFacilityModal(): void {
    if (!(addFacilityModal instanceof HTMLDivElement)) {
      return;
    }

    addFacilityModal.hidden = false;
    addFacilityModal.setAttribute("aria-hidden", "false");

    updateSelectedFacilityCount();
  }

  function closeAddFacilityModal(): void {
    if (!(addFacilityModal instanceof HTMLDivElement)) {
      return;
    }

    facilityCheckboxes.forEach((checkbox) => {
      checkbox.checked = false;
    });

    updateSelectedFacilityCount();

    addFacilityModal.hidden = true;
    addFacilityModal.setAttribute("aria-hidden", "true");
  }

  openAddFacilityButtons.forEach((button) => {
    button.addEventListener("click", openAddFacilityModal);
  });

  facilityCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", updateSelectedFacilityCount);
  });

  closeAddFacilityButton?.addEventListener("click", closeAddFacilityModal);
  cancelAddFacilitiesButton?.addEventListener("click", closeAddFacilityModal);
  closeAddFacilityBackdrop?.addEventListener("click", closeAddFacilityModal);

  /* ========================================
     Add Selected Facilities
  ======================================== */

  addSelectedFacilitiesButton?.addEventListener("click", () => {
    const selectedCheckboxes = facilityCheckboxes.filter(
      (checkbox) => checkbox.checked,
    );

    if (selectedCheckboxes.length === 0) {
      updateSelectedFacilityCount();
      return;
    }

    selectedCheckboxes.forEach((checkbox) => {
      const facilityId = Number(checkbox.dataset.facilityId);
      const facilityName = checkbox.dataset.facilityName ?? "";

      if (
        !Number.isInteger(facilityId) ||
        facilityId <= 0 ||
        !facilityName
      ) {
        return;
      }

      // Do not block facilities already assigned to another floor.
      addFacilityToTable(facilityId, facilityName);
    });

    closeAddFacilityModal();
  });

  /* ========================================
     Remove Facility Entry
  ======================================== */

  if (
    removeFacilityDialog instanceof HTMLDivElement &&
    facilityBody instanceof HTMLTableSectionElement
  ) {
    let pendingRow: HTMLTableRowElement | null = null;

    facilityBody.addEventListener("click", (event) => {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const removeButton = target.closest("[data-remove-facility]");

      if (!(removeButton instanceof HTMLElement)) {
        return;
      }

      const row = removeButton.closest("[data-facility-row]");

      if (!(row instanceof HTMLTableRowElement)) {
        return;
      }

      pendingRow = row;

      const facilityName =
        row.dataset.facilityName ??
        removeButton.dataset.facilityName ??
        "this facility";

      const floorInput = row.querySelector<HTMLInputElement>(
        '[name="facility_entry_floor"]',
      );

      const floor = floorInput?.value.trim();

      removeFacilityDialog.dispatchEvent(
        new CustomEvent("dialog:open", {
          detail: {
            name: floor ? `${facilityName} — ${floor}` : facilityName,
          },
        }),
      );
    });

    removeFacilityDialog.addEventListener("confirm", () => {
      if (!pendingRow || !pendingRow.isConnected) {
        pendingRow = null;
        return;
      }

      removeFacilityRow(pendingRow);
      pendingRow = null;
    });
  }

  /* ========================================
     Initial State
  ======================================== */

  updateFacilityEmptyState();
  updateAllFacilitiesMessage();
  updateSelectedFacilityCount();
}