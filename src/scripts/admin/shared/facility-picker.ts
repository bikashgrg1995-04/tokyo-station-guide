
/**
 * Floor-wise facility picker for Edit Station.
 *
 * Supports:
 * - Selecting a station floor using floor pills.
 * - Showing only facilities not yet assigned to the selected floor.
 * - Assigning the same facility to multiple floors.
 * - Saving floor IDs instead of free-text floor names.
 * - Editing quantity and optional notes.
 * - Preparing selected exit IDs for each facility assignment.
 * - Removing individual floor assignments.
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

  const facilityOptions = Array.from(
    document.querySelectorAll<HTMLElement>("[data-facility-option]"),
  );

  const floorOptions = Array.from(
    document.querySelectorAll<HTMLButtonElement>(
      "[data-facility-floor-option]",
    ),
  );

  const selectedFloorInput = document.getElementById(
    "selected-facility-floor-id",
  );

  const floorEmptyMessage = document.getElementById(
    "facility-floor-empty-message",
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
     Floor Helpers
  ======================================== */

  function getSelectedFloorId(): number | null {
    if (!(selectedFloorInput instanceof HTMLInputElement)) {
      return null;
    }

    const floorId = Number(selectedFloorInput.value);

    return Number.isInteger(floorId) && floorId > 0 ? floorId : null;
  }

  function getSelectedFloorName(): string {
    const selectedFloorId = getSelectedFloorId();

    const selectedButton = floorOptions.find(
      (button) => Number(button.dataset.floorId) === selectedFloorId,
    );

    return selectedButton?.textContent?.trim() ?? "";
  }

  function selectFloor(floorId: number): void {
    const selectedButton = floorOptions.find(
      (button) => Number(button.dataset.floorId) === floorId,
    );

    if (!selectedButton) {
      return;
    }

    if (selectedFloorInput instanceof HTMLInputElement) {
      selectedFloorInput.value = String(floorId);
    }

    floorOptions.forEach((button) => {
      const isSelected = Number(button.dataset.floorId) === floorId;

      button.setAttribute("aria-pressed", String(isSelected));
    });

    // A selection from another floor must not carry over.
    facilityCheckboxes.forEach((checkbox) => {
      checkbox.checked = false;
    });

    updateFacilityOptions();
    updateSelectedFacilityCount();
  }

  /* ========================================
     Facility Table Helpers
  ======================================== */

  function getFacilityRows(): HTMLTableRowElement[] {
    if (!(facilityBody instanceof HTMLTableSectionElement)) {
      return [];
    }

    return Array.from(
      facilityBody.querySelectorAll<HTMLTableRowElement>("[data-facility-row]"),
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
      cell.colSpan = 6;

      const message = document.createElement("div");
      message.className = "admin-feature-empty";
      message.textContent = "No facilities assigned.";

      cell.appendChild(message);
      emptyRow.appendChild(cell);
      facilityBody.appendChild(emptyRow);
    }
  }

  function updateFacilityOptions(): void {
    const selectedFloorId = getSelectedFloorId();

    const existingRows = getFacilityRows();
    const assignedFacilityIds = new Set<number>();

    existingRows.forEach((row) => {
      const rowFloorId = Number(row.dataset.floorId);
      const rowFacilityId = Number(row.dataset.facilityId);

      if (
        selectedFloorId !== null &&
        rowFloorId === selectedFloorId &&
        Number.isInteger(rowFacilityId) &&
        rowFacilityId > 0
      ) {
        assignedFacilityIds.add(rowFacilityId);
      }
    });

    let visibleOptionCount = 0;

    facilityOptions.forEach((option) => {
      const facilityId = Number(option.dataset.facilityOptionId);

      const alreadyAssigned = assignedFacilityIds.has(facilityId);

      const shouldShow =
        selectedFloorId !== null &&
        Number.isInteger(facilityId) &&
        facilityId > 0 &&
        !alreadyAssigned;

      option.hidden = !shouldShow;

      if (!shouldShow) {
        const checkbox = option.querySelector<HTMLInputElement>(
          ".add-facility-checkbox",
        );

        if (checkbox) {
          checkbox.checked = false;
        }
      } else {
        visibleOptionCount += 1;
      }
    });

    if (floorEmptyMessage instanceof HTMLElement) {
      floorEmptyMessage.hidden = visibleOptionCount > 0;
    }

    if (allFacilitiesMessage instanceof HTMLElement) {
      allFacilitiesMessage.hidden = facilityOptions.length > 0;
    }

    updateSelectedFacilityCount();
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
    floorId: number,
    floorName: string,
  ): HTMLTableRowElement | null {
    if (!(facilityBody instanceof HTMLTableSectionElement)) {
      return null;
    }

    if (
      !Number.isInteger(facilityId) ||
      facilityId <= 0 ||
      !Number.isInteger(floorId) ||
      floorId <= 0 ||
      !facilityName ||
      !floorName
    ) {
      return null;
    }

    // Prevent duplicate assignments to the same floor.
    const duplicate = getFacilityRows().some(
      (row) =>
        Number(row.dataset.facilityId) === facilityId &&
        Number(row.dataset.floorId) === floorId,
    );

    if (duplicate) {
      return null;
    }

    const row = document.createElement("tr");

    row.setAttribute("data-facility-row", "");
    row.dataset.facilityId = String(facilityId);
    row.dataset.facilityName = facilityName;
    row.dataset.floorId = String(floorId);
    row.dataset.floorName = floorName;

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

    /* Floor pill and floor ID */

    const floorCell = document.createElement("td");

    const floorPill = document.createElement("span");
    floorPill.className = "admin-floor-pill";
    floorPill.setAttribute("data-floor-pill", "");
    floorPill.textContent = floorName;

    const floorIdInput = document.createElement("input");
    floorIdInput.type = "hidden";
    floorIdInput.name = "facility_entry_floor_id";
    floorIdInput.value = String(floorId);

    floorCell.appendChild(floorPill);
    floorCell.appendChild(floorIdInput);

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

    /* Nearby Exits */

    const exitsCell = document.createElement("td");

    const exitPills = document.createElement("div");
    exitPills.className = "facility-exit-pills";
    exitPills.setAttribute("data-facility-exit-pills", "");

    const emptyExits = document.createElement("span");
    emptyExits.className = "facility-exit-empty";
    emptyExits.setAttribute("data-no-exits", "");
    emptyExits.textContent = "No exits assigned";

    exitPills.appendChild(emptyExits);

    const exitIdsInput = document.createElement("input");
    exitIdsInput.type = "hidden";
    exitIdsInput.name = "facility_entry_exit_ids_json";
    exitIdsInput.value = "[]";
    exitIdsInput.setAttribute("data-facility-exit-ids", "");

    const addExitsButton = document.createElement("button");
    addExitsButton.type = "button";
    addExitsButton.className = "admin-table-action";
    addExitsButton.setAttribute("data-open-facility-exits", "");
    addExitsButton.textContent = "+ Add Exits";

    exitsCell.appendChild(exitPills);
    exitsCell.appendChild(exitIdsInput);
    exitsCell.appendChild(addExitsButton);

    /* Optional note */

    const noteCell = document.createElement("td");

    const noteInput = createInput("facility_entry_note", "", {
      placeholder: "Optional note",
      maxLength: 500,
      ariaLabel: `Note for ${facilityName}`,
    });

    noteCell.appendChild(noteInput);

    /* Actions */

    const actionsCell = document.createElement("td");

    const actions = document.createElement("div");
    actions.className = "admin-table-actions";

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "admin-table-action admin-table-action-delete";

    removeButton.setAttribute("data-remove-facility", "");
    removeButton.dataset.facilityName = facilityName;
    removeButton.dataset.floorName = floorName;
    removeButton.textContent = "Remove";

    actions.appendChild(removeButton);
    actionsCell.appendChild(actions);

    row.appendChild(nameCell);
    row.appendChild(floorCell);
    row.appendChild(countCell);
    row.appendChild(exitsCell);
    row.appendChild(noteCell);
    row.appendChild(actionsCell);

    const emptyRow = document.getElementById("station-facilities-empty-row");

    if (emptyRow?.parentElement === facilityBody) {
      facilityBody.insertBefore(row, emptyRow);
    } else {
      facilityBody.appendChild(row);
    }

    updateFacilityEmptyState();

    return row;
  }

  function removeFacilityRow(row: HTMLTableRowElement): void {
    row.remove();

    updateFacilityEmptyState();
    updateFacilityOptions();
  }

  /* ========================================
     Modal Selection
  ======================================== */

  function updateSelectedFacilityCount(): void {
    if (!(selectedFacilityCount instanceof HTMLElement)) {
      return;
    }

    const selectedCount = facilityCheckboxes.filter(
      (checkbox) => checkbox.checked && !checkbox.closest("[hidden]"),
    ).length;

    selectedFacilityCount.textContent = `${selectedCount} ${
      selectedCount === 1 ? "facility" : "facilities"
    } selected`;

    if (addSelectedFacilitiesButton instanceof HTMLButtonElement) {
      addSelectedFacilitiesButton.disabled =
        selectedCount === 0 || getSelectedFloorId() === null;
    }
  }

  function openAddFacilityModal(): void {
    if (!(addFacilityModal instanceof HTMLDivElement)) {
      return;
    }

    if (floorOptions.length === 0) {
      return;
    }

    const currentFloorId = getSelectedFloorId();

    const currentFloorExists = floorOptions.some(
      (button) => Number(button.dataset.floorId) === currentFloorId,
    );

    if (!currentFloorExists) {
      const firstFloorId = Number(floorOptions[0].dataset.floorId);

      selectFloor(firstFloorId);
    } else {
      updateFacilityOptions();
    }

    addFacilityModal.hidden = false;
    addFacilityModal.setAttribute("aria-hidden", "false");
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

  floorOptions.forEach((button) => {
    button.addEventListener("click", () => {
      const floorId = Number(button.dataset.floorId);

      if (Number.isInteger(floorId) && floorId > 0) {
        selectFloor(floorId);
      }
    });
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
    const floorId = getSelectedFloorId();
    const floorName = getSelectedFloorName();

    if (floorId === null || !floorName) {
      return;
    }

    const selectedCheckboxes = facilityCheckboxes.filter(
      (checkbox) => checkbox.checked && !checkbox.closest("[hidden]"),
    );

    if (selectedCheckboxes.length === 0) {
      updateSelectedFacilityCount();
      return;
    }

    selectedCheckboxes.forEach((checkbox) => {
      const facilityId = Number(checkbox.dataset.facilityId);
      const facilityName = checkbox.dataset.facilityName ?? "";

      if (!Number.isInteger(facilityId) || facilityId <= 0 || !facilityName) {
        return;
      }

      addFacilityToTable(facilityId, facilityName, floorId, floorName);
    });

    updateFacilityOptions();
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

      const floorName =
        row.dataset.floorName ?? removeButton.dataset.floorName ?? "";

      removeFacilityDialog.dispatchEvent(
        new CustomEvent("dialog:open", {
          detail: {
            name: floorName ? `${facilityName} — ${floorName}` : facilityName,
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

  if (floorOptions.length > 0) {
    const firstFloorId = Number(floorOptions[0].dataset.floorId);

    if (Number.isInteger(firstFloorId) && firstFloorId > 0) {
      selectFloor(firstFloorId);
    }
  }

  updateFacilityEmptyState();
  updateFacilityOptions();
  updateSelectedFacilityCount();
}
