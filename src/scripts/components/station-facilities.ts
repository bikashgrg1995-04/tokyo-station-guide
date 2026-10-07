// Moved as-is from src/components/StationFacilities.astro

/* ========================================
   Elements
======================================== */

const addFacilityModal =
  document.getElementById(
    "add-facility-modal",
  );

const openAddFacilityButton =
  document.getElementById(
    "open-add-facility-button",
  );

const closeAddFacilityButton =
  document.getElementById(
    "close-add-facility-modal",
  );

const cancelAddFacilitiesButton =
  document.getElementById(
    "cancel-add-facilities",
  );

const closeAddFacilityBackdrop =
  document.querySelector(
    "[data-close-add-facility-modal]",
  );

const facilityCheckboxes =
  document.querySelectorAll(
    ".add-facility-checkbox",
  );

const selectedFacilityCount =
  document.getElementById(
    "selected-facility-count",
  );

const addSelectedFacilitiesButton =
  document.getElementById(
    "add-selected-facilities",
  );

const facilityBody =
  document.getElementById(
    "station-facilities-body",
  );

const facilityInputs =
  document.getElementById(
    "station-facility-inputs",
  );

const allFacilitiesMessage =
  document.getElementById(
    "all-facilities-message",
  );


/* ========================================
   Helpers
======================================== */

function facilityAlreadySelected(
  facilityId: number,
): boolean {
  return !!document.querySelector(
    `[data-facility-row][data-facility-id="${facilityId}"]`,
  );
}


function updateFacilityEmptyState(): void {

  if (
    !(facilityBody instanceof HTMLElement)
  ) {
    return;
  }

  const rows =
    facilityBody.querySelectorAll(
      "[data-facility-row]",
    );

  const emptyRow =
    document.getElementById(
      "station-facilities-empty-row",
    );

  if (rows.length === 0) {

    if (!emptyRow) {

      facilityBody.innerHTML = `
          <tr id="station-facilities-empty-row">
            <td colspan="3">
              <div class="admin-empty">

                <div class="admin-empty-icon">
                  ◦
                </div>

                <h3>
                  No Facilities Assigned
                </h3>

                <p>
                  There are currently no facilities
                  assigned to this station.
                </p>

              </div>
            </td>
          </tr>
        `;

    }

  } else {

    emptyRow?.remove();

  }
}


function updateAllFacilitiesMessage(): void {

  if (
    !(allFacilitiesMessage instanceof HTMLElement)
  ) {
    return;
  }

  const facilityOptions =
    document.querySelectorAll(
      "[data-facility-option]",
    );

  if (facilityOptions.length === 0) {
    allFacilitiesMessage.hidden = true;
    return;
  }

  const visibleOptions =
    Array.from(facilityOptions).filter(
      (option) =>
        option instanceof HTMLElement &&
        option.style.display !== "none",
    );

  allFacilitiesMessage.hidden =
    visibleOptions.length > 0;
}


function syncFacilityOptions(): void {

  const rows =
    document.querySelectorAll(
      "[data-facility-row]",
    );

  const selectedIds =
    new Set<number>();

  rows.forEach((row) => {

    if (!(row instanceof HTMLElement)) {
      return;
    }

    const facilityId = Number(
      row.dataset.facilityId,
    );

    if (
      Number.isInteger(facilityId) &&
      facilityId > 0
    ) {
      selectedIds.add(facilityId);
    }

  });


  facilityCheckboxes.forEach(
    (checkbox) => {

      if (
        !(checkbox instanceof HTMLInputElement)
      ) {
        return;
      }

      const facilityId = Number(
        checkbox.dataset.facilityId,
      );

      const selected =
        selectedIds.has(facilityId);

      checkbox.checked = false;
      checkbox.disabled = selected;

      const option =
        checkbox.closest(
          "[data-facility-option]",
        );

      if (
        option instanceof HTMLElement
      ) {
        option.style.display =
          selected
            ? "none"
            : "";
      }

    },
  );

  updateAllFacilitiesMessage();
}


function addFacilityToTable(
  facilityId: number,
  facilityName: string,
  facilitySlug: string,
): void {

  if (
    !(facilityBody instanceof HTMLElement) ||
    !(facilityInputs instanceof HTMLElement)
  ) {
    return;
  }

  if (
    facilityAlreadySelected(
      facilityId,
    )
  ) {
    return;
  }


  const row =
    document.createElement("tr");

  row.setAttribute(
    "data-facility-row",
    "",
  );

  row.setAttribute(
    "data-facility-id",
    String(facilityId),
  );


  row.innerHTML = `
      <td>
        <div class="admin-line-name">
          ${facilityName}
        </div>
      </td>

      <td>
        <span class="admin-line-slug">
          ${facilitySlug}
        </span>
      </td>

      <td>
        <div class="admin-table-actions">

          <button
            type="button"
            class="admin-table-action admin-table-action-delete"
            data-remove-facility="${facilityId}"
            data-facility-name="${facilityName}"
          >
            Remove
          </button>

        </div>
      </td>
    `;


  facilityBody.appendChild(row);


  const input =
    document.createElement("input");

  input.type = "hidden";
  input.name = "facility_ids";
  input.value = String(facilityId);

  input.setAttribute(
    "data-facility-input",
    String(facilityId),
  );


  facilityInputs.appendChild(input);


  updateFacilityEmptyState();
  syncFacilityOptions();

}


function removeFacilityFromTable(
  facilityId: number,
): void {

  const row =
    document.querySelector(
      `[data-facility-row][data-facility-id="${facilityId}"]`,
    );

  const input =
    document.querySelector(
      `[data-facility-input="${facilityId}"]`,
    );


  row?.remove();
  input?.remove();


  updateFacilityEmptyState();
  syncFacilityOptions();

}


/* ========================================
   Modal
======================================== */

function openAddFacilityModal(): void {

  if (
    !(addFacilityModal instanceof HTMLDivElement)
  ) {
    return;
  }

  syncFacilityOptions();

  addFacilityModal.hidden = false;

  addFacilityModal.setAttribute(
    "aria-hidden",
    "false",
  );

  updateSelectedFacilityCount();

}


function closeAddFacilityModal(): void {

  if (
    !(addFacilityModal instanceof HTMLDivElement)
  ) {
    return;
  }

  facilityCheckboxes.forEach(
    (checkbox) => {

      if (
        checkbox instanceof HTMLInputElement
      ) {
        checkbox.checked = false;
      }

    },
  );

  updateSelectedFacilityCount();

  addFacilityModal.hidden = true;

  addFacilityModal.setAttribute(
    "aria-hidden",
    "true",
  );

}


function updateSelectedFacilityCount(): void {

  if (
    !(selectedFacilityCount instanceof HTMLElement)
  ) {
    return;
  }

  const selectedCount =
    document.querySelectorAll(
      ".add-facility-checkbox:checked",
    ).length;


  selectedFacilityCount.textContent =
    `${selectedCount} ${
        selectedCount === 1
          ? "facility"
          : "facilities"
      } selected`;


  if (
    addSelectedFacilitiesButton instanceof
    HTMLButtonElement
  ) {
    addSelectedFacilitiesButton.disabled =
      selectedCount === 0;
  }

}


openAddFacilityButton?.addEventListener(
  "click",
  openAddFacilityModal,
);


facilityCheckboxes.forEach(
  (checkbox) => {

    checkbox.addEventListener(
      "change",
      updateSelectedFacilityCount,
    );

  },
);


closeAddFacilityButton?.addEventListener(
  "click",
  closeAddFacilityModal,
);


cancelAddFacilitiesButton?.addEventListener(
  "click",
  closeAddFacilityModal,
);


closeAddFacilityBackdrop?.addEventListener(
  "click",
  closeAddFacilityModal,
);


/* ========================================
   Add Selected
======================================== */

addSelectedFacilitiesButton?.addEventListener(
  "click",
  () => {

    const selectedCheckboxes =
      Array.from(
        facilityCheckboxes,
      ).filter(
        (checkbox) =>
          checkbox instanceof HTMLInputElement &&
          checkbox.checked,
      );


    if (
      selectedCheckboxes.length === 0
    ) {
      updateSelectedFacilityCount();
      return;
    }


    selectedCheckboxes.forEach(
      (checkbox) => {

        if (
          !(checkbox instanceof HTMLInputElement)
        ) {
          return;
        }


        const facilityId = Number(
          checkbox.dataset.facilityId,
        );

        const facilityName =
          checkbox.dataset.facilityName ??
          "";

        const facilitySlug =
          checkbox.dataset.facilitySlug ??
          "";


        if (
          !Number.isInteger(facilityId) ||
          facilityId <= 0
        ) {
          return;
        }


        addFacilityToTable(
          facilityId,
          facilityName,
          facilitySlug,
        );

      },
    );


    closeAddFacilityModal();

  },
);


/* ========================================
   Remove Facility
======================================== */

const removeFacilityDialog =
  document.getElementById(
    "remove-facility-confirm-dialog",
  );


if (
  removeFacilityDialog instanceof HTMLDivElement
) {

  let pendingFacilityId:
    number | null = null;


  facilityBody?.addEventListener(
    "click",
    (event) => {

      const target =
        event.target;

      if (
        !(target instanceof HTMLElement)
      ) {
        return;
      }


      const removeButton =
        target.closest(
          "[data-remove-facility]",
        );


      if (
        !(removeButton instanceof HTMLElement)
      ) {
        return;
      }


      const facilityId = Number(
        removeButton.getAttribute(
          "data-remove-facility",
        ),
      );


      if (
        !Number.isInteger(facilityId) ||
        facilityId <= 0
      ) {
        return;
      }


      pendingFacilityId =
        facilityId;


      const facilityName =
        removeButton.getAttribute(
          "data-facility-name",
        ) ??
        "this facility";


      removeFacilityDialog.dispatchEvent(
        new CustomEvent(
          "dialog:open",
          {
            detail: {
              name: facilityName,
            },
          },
        ),
      );

    },
  );


  removeFacilityDialog.addEventListener(
    "confirm",
    () => {

      if (
        pendingFacilityId === null
      ) {
        return;
      }


      removeFacilityFromTable(
        pendingFacilityId,
      );


      pendingFacilityId = null;

    },
  );

}


/* ========================================
   Initial State
======================================== */

updateFacilityEmptyState();
syncFacilityOptions();
updateSelectedFacilityCount();

export {};
