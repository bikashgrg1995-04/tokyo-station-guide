// Moved as-is from src/components/StationTopPicks.astro

/* ========================================
   Elements
======================================== */

const addTopPickModal =
  document.getElementById(
    "add-top-pick-modal",
  );

const openAddTopPickButton =
  document.getElementById(
    "open-add-top-pick-button",
  );

const closeAddTopPickButton =
  document.getElementById(
    "close-add-top-pick-modal",
  );

const cancelAddTopPicksButton =
  document.getElementById(
    "cancel-add-top-picks",
  );

const closeAddTopPickBackdrop =
  document.querySelector(
    "[data-close-add-top-pick-modal]",
  );

const topPickCheckboxes =
  document.querySelectorAll(
    ".add-top-pick-checkbox",
  );

const selectedTopPickCount =
  document.getElementById(
    "selected-top-pick-count",
  );

const addSelectedTopPicksButton =
  document.getElementById(
    "add-selected-top-picks",
  );

const topPickBody =
  document.getElementById(
    "station-top-picks-body",
  );

const topPickInputs =
  document.getElementById(
    "station-top-pick-inputs",
  );

const allTopPicksMessage =
  document.getElementById(
    "all-top-picks-message",
  );


/* ========================================
   Helpers
======================================== */

function topPickAlreadySelected(
  topPickId: number,
): boolean {
  return !!document.querySelector(
    `[data-top-pick-row][data-top-pick-id="${topPickId}"]`,
  );
}


function updateTopPickEmptyState(): void {

  if (
    !(topPickBody instanceof HTMLElement)
  ) {
    return;
  }

  const rows =
    topPickBody.querySelectorAll(
      "[data-top-pick-row]",
    );

  const emptyRow =
    document.getElementById(
      "station-top-picks-empty-row",
    );

  if (rows.length === 0) {

    if (!emptyRow) {

      topPickBody.innerHTML = `
          <tr id="station-top-picks-empty-row">
            <td colspan="4">
              <div class="admin-empty">

                <div class="admin-empty-icon">
                  ◦
                </div>

                <h3>
                  No Top Picks Assigned
                </h3>

                <p>
                  There are currently no top picks
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


function updateAllTopPicksMessage(): void {

  if (
    !(allTopPicksMessage instanceof HTMLElement)
  ) {
    return;
  }

  const topPickOptions =
    document.querySelectorAll(
      "[data-top-pick-option]",
    );

  if (topPickOptions.length === 0) {

    allTopPicksMessage.hidden = true;
    return;

  }

  const visibleOptions =
    Array.from(topPickOptions).filter(
      (option) =>
        option instanceof HTMLElement &&
        option.style.display !== "none",
    );

  allTopPicksMessage.hidden =
    visibleOptions.length > 0;

}


function syncTopPickOptions(): void {

  const rows =
    document.querySelectorAll(
      "[data-top-pick-row]",
    );

  const selectedIds =
    new Set<number>();

  rows.forEach((row) => {

    if (!(row instanceof HTMLElement)) {
      return;
    }

    const topPickId =
      Number(
        row.dataset.topPickId,
      );

    if (
      Number.isInteger(topPickId) &&
      topPickId > 0
    ) {
      selectedIds.add(topPickId);
    }

  });


  topPickCheckboxes.forEach(
    (checkbox) => {

      if (
        !(checkbox instanceof HTMLInputElement)
      ) {
        return;
      }

      const topPickId =
        Number(
          checkbox.dataset.topPickId,
        );

      const selected =
        selectedIds.has(topPickId);

      checkbox.checked = false;
      checkbox.disabled = selected;

      const option =
        checkbox.closest(
          "[data-top-pick-option]",
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

  updateAllTopPicksMessage();

}


function addTopPickToTable(
  topPickId: number,
  topPickName: string,
  topPickSlug: string,
  topPickCategory: string,
): void {

  if (
    !(topPickBody instanceof HTMLElement) ||
    !(topPickInputs instanceof HTMLElement)
  ) {
    return;
  }

  if (
    topPickAlreadySelected(
      topPickId,
    )
  ) {
    return;
  }


  const row =
    document.createElement("tr");

  row.setAttribute(
    "data-top-pick-row",
    "",
  );

  row.setAttribute(
    "data-top-pick-id",
    String(topPickId),
  );


  row.innerHTML = `
      <td>
        <div class="admin-line-name">
          ${topPickName}
        </div>
      </td>

      <td>
        <span class="admin-line-slug">
          ${topPickSlug}
        </span>
      </td>

      <td>
        <span class="admin-line-slug">
          ${topPickCategory}
        </span>
      </td>

      <td>
        <div class="admin-table-actions">

          <button
            type="button"
            class="admin-table-action admin-table-action-delete"
            data-remove-top-pick="${topPickId}"
            data-top-pick-name="${topPickName}"
          >
            Remove
          </button>

        </div>
      </td>
    `;


  topPickBody.appendChild(row);


  const input =
    document.createElement("input");

  input.type = "hidden";
  input.name = "top_pick_ids";
  input.value = String(topPickId);

  input.setAttribute(
    "data-top-pick-input",
    String(topPickId),
  );


  topPickInputs.appendChild(input);


  updateTopPickEmptyState();
  syncTopPickOptions();

}


function removeTopPickFromTable(
  topPickId: number,
): void {

  const row =
    document.querySelector(
      `[data-top-pick-row][data-top-pick-id="${topPickId}"]`,
    );

  const input =
    document.querySelector(
      `[data-top-pick-input="${topPickId}"]`,
    );


  row?.remove();
  input?.remove();


  updateTopPickEmptyState();
  syncTopPickOptions();

}


/* ========================================
   Modal
======================================== */

function openAddTopPickModal(): void {

  if (
    !(addTopPickModal instanceof HTMLDivElement)
  ) {
    return;
  }

  syncTopPickOptions();

  addTopPickModal.hidden = false;

  addTopPickModal.setAttribute(
    "aria-hidden",
    "false",
  );

  updateSelectedTopPickCount();

}


function closeAddTopPickModal(): void {

  if (
    !(addTopPickModal instanceof HTMLDivElement)
  ) {
    return;
  }

  topPickCheckboxes.forEach(
    (checkbox) => {

      if (
        checkbox instanceof HTMLInputElement
      ) {
        checkbox.checked = false;
      }

    },
  );

  updateSelectedTopPickCount();

  addTopPickModal.hidden = true;

  addTopPickModal.setAttribute(
    "aria-hidden",
    "true",
  );

}


function updateSelectedTopPickCount(): void {

  if (
    !(selectedTopPickCount instanceof HTMLElement)
  ) {
    return;
  }

  const selectedCount =
    document.querySelectorAll(
      ".add-top-pick-checkbox:checked",
    ).length;


  selectedTopPickCount.textContent =
    `${selectedCount} ${
        selectedCount === 1
          ? "top pick"
          : "top picks"
      } selected`;


  if (
    addSelectedTopPicksButton instanceof
    HTMLButtonElement
  ) {
    addSelectedTopPicksButton.disabled =
      selectedCount === 0;
  }

}


openAddTopPickButton?.addEventListener(
  "click",
  openAddTopPickModal,
);


topPickCheckboxes.forEach(
  (checkbox) => {

    checkbox.addEventListener(
      "change",
      updateSelectedTopPickCount,
    );

  },
);


closeAddTopPickButton?.addEventListener(
  "click",
  closeAddTopPickModal,
);


cancelAddTopPicksButton?.addEventListener(
  "click",
  closeAddTopPickModal,
);


closeAddTopPickBackdrop?.addEventListener(
  "click",
  closeAddTopPickModal,
);


/* ========================================
   Add Selected
======================================== */

addSelectedTopPicksButton?.addEventListener(
  "click",
  () => {

    const selectedCheckboxes =
      Array.from(
        topPickCheckboxes,
      ).filter(
        (checkbox) =>
          checkbox instanceof HTMLInputElement &&
          checkbox.checked,
      );


    if (
      selectedCheckboxes.length === 0
    ) {
      updateSelectedTopPickCount();
      return;
    }


    selectedCheckboxes.forEach(
      (checkbox) => {

        if (
          !(checkbox instanceof HTMLInputElement)
        ) {
          return;
        }


        const topPickId =
          Number(
            checkbox.dataset.topPickId,
          );

        const topPickName =
          checkbox.dataset.topPickName ??
          "";

        const topPickSlug =
          checkbox.dataset.topPickSlug ??
          "";

        const topPickCategory =
          checkbox.dataset.topPickCategory ??
          "";


        if (
          !Number.isInteger(topPickId) ||
          topPickId <= 0
        ) {
          return;
        }


        addTopPickToTable(
          topPickId,
          topPickName,
          topPickSlug,
          topPickCategory,
        );

      },
    );


    closeAddTopPickModal();

  },
);


/* ========================================
   Remove Top Pick
======================================== */

const removeTopPickDialog =
  document.getElementById(
    "remove-top-pick-confirm-dialog",
  );


if (
  removeTopPickDialog instanceof HTMLDivElement
) {

  let pendingTopPickId:
    number | null = null;


  topPickBody?.addEventListener(
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
          "[data-remove-top-pick]",
        );


      if (
        !(removeButton instanceof HTMLElement)
      ) {
        return;
      }


      const topPickId =
        Number(
          removeButton.getAttribute(
            "data-remove-top-pick",
          ),
        );


      if (
        !Number.isInteger(topPickId) ||
        topPickId <= 0
      ) {
        return;
      }


      pendingTopPickId =
        topPickId;


      const topPickName =
        removeButton.getAttribute(
          "data-top-pick-name",
        ) ??
        "this top pick";


      removeTopPickDialog.dispatchEvent(
        new CustomEvent(
          "dialog:open",
          {
            detail: {
              name: topPickName,
            },
          },
        ),
      );

    },
  );


  removeTopPickDialog.addEventListener(
    "confirm",
    () => {

      if (
        pendingTopPickId === null
      ) {
        return;
      }


      removeTopPickFromTable(
        pendingTopPickId,
      );


      pendingTopPickId = null;

    },
  );

}


/* ========================================
   Initial State
======================================== */

updateTopPickEmptyState();
syncTopPickOptions();
updateSelectedTopPickCount();

export {};
