// Top Pick > Stations page: add/edit modal, station picker and table search.

const modal =
  document.querySelector("#station-modal") as HTMLElement | null;

const openAddButton =
  document.querySelector("#open-add-modal") as HTMLButtonElement | null;

const closeButtons = document.querySelectorAll("[data-close-modal]");

const assignmentForm =
  document.querySelector("#station-assignment-form") as HTMLFormElement | null;

const stationSelect =
  document.querySelector("#modal-station") as HTMLSelectElement | null;

const hiddenStationId =
  document.querySelector("#modal-station-id-hidden") as HTMLInputElement | null;

const floorSelect =
  document.querySelector("#modal-floor") as HTMLSelectElement | null;

const exitSelect =
  document.querySelector("#modal-exit") as HTMLSelectElement | null;

const locationSelect =
  document.querySelector("#modal-location") as HTMLSelectElement | null;

const walkingInput =
  document.querySelector("#modal-walking") as HTMLInputElement | null;

const orderInput =
  document.querySelector("#modal-order") as HTMLInputElement | null;

const modalTitle =
  document.querySelector("#station-modal-title") as HTMLElement | null;

const modalDescription =
  document.querySelector("#station-modal-description") as HTMLElement | null;

const modalSubmit =
  document.querySelector("#station-modal-submit") as HTMLButtonElement | null;

const searchInput =
  document.querySelector("#station-search") as HTMLInputElement | null;

const searchEmpty =
  document.querySelector("#station-search-empty") as HTMLElement | null;

const stationPickerSearch =
  document.querySelector("#station-picker-search") as HTMLInputElement | null;

const stationPickerList =
  document.querySelector("#station-picker-list") as HTMLElement | null;

const stationPickerEmpty =
  document.querySelector("#station-picker-empty") as HTMLElement | null;

const stationPickerSelected =
  document.querySelector("#station-picker-selected") as HTMLElement | null;

const stationPickerBody =
  document.querySelector("#station-picker-body") as HTMLElement | null;

const stationPickerCount =
  document.querySelector("#station-picker-count") as HTMLElement | null;

const stationChip =
  document.querySelector("#station-chip") as HTMLElement | null;

const stationChipName =
  document.querySelector("#station-chip-name") as HTMLElement | null;

const stationChipJp =
  document.querySelector("#station-chip-jp") as HTMLElement | null;

const stationChipClear =
  document.querySelector("#station-chip-clear") as HTMLButtonElement | null;

const stationPickerOptions = Array.from(
  document.querySelectorAll(".station-picker-option"),
) as HTMLButtonElement[];

const filterFloorsAndExits = (resetFloor: boolean) => {
  if (!stationSelect || !floorSelect || !exitSelect) return;

  const stationId = stationSelect.value;

  Array.from(floorSelect.options).forEach((option) => {
    if (!option.value) {
      option.hidden = false;
      return;
    }

    option.hidden = option.dataset.stationId !== stationId;
  });

  if (resetFloor) {
    floorSelect.value = "";
  }

  const floorId = floorSelect.value;

  Array.from(exitSelect.options).forEach((option) => {
    if (!option.value) {
      option.hidden = false;
      return;
    }

    option.hidden =
      option.dataset.stationId !== stationId ||
      !floorId ||
      option.dataset.floorId !== floorId;
  });

  const selectedExit = exitSelect.selectedOptions[0];

  if (selectedExit?.value && selectedExit.hidden) {
    exitSelect.value = "";
  }
};

const visiblePickerOptions = () =>
  stationPickerOptions.filter((option) => !option.hidden);

const filterStationPicker = () => {
  if (!stationPickerSearch || !stationSelect) return;

  const query = stationPickerSearch.value.trim().toLowerCase();
  let visibleCount = 0;

  stationPickerOptions.forEach((option) => {
    const stationId = option.dataset.stationId ?? "";

    const searchableText =
      `${option.dataset.stationName ?? ""} ${option.dataset.stationJapanese ?? ""}`
        .toLowerCase();

    const isSelected = stationSelect.value === stationId;

    const isAssigned =
      option.dataset.assigned === "true" &&
      !stationSelect.disabled &&
      !isSelected;

    const matches = searchableText.includes(query);

    option.hidden = !matches || isAssigned;
    option.setAttribute("aria-pressed", String(isSelected));

    if (!option.hidden) {
      visibleCount++;
    }
  });

  if (stationPickerEmpty) {
    stationPickerEmpty.hidden = visibleCount > 0;
  }

  if (stationPickerList) {
    stationPickerList.hidden = visibleCount === 0;
  }

  if (stationPickerCount) {
    stationPickerCount.textContent = stationSelect.value
      ? ""
      : `${visibleCount} ${query ? "found" : "available"}`;
  }
};

// Show either the search box + results, or the chosen station.
const syncStationPicker = () => {
  if (!stationSelect) return;

  const selectedId = stationSelect.value;

  const selectedOption = stationPickerOptions.find(
    (option) => option.dataset.stationId === selectedId,
  );

  const hasSelection = Boolean(selectedId && selectedOption);

  if (stationChip) {
    stationChip.hidden = !hasSelection;
  }

  if (stationPickerBody) {
    stationPickerBody.hidden = hasSelection;
  }

  if (stationChipName) {
    stationChipName.textContent = selectedOption?.dataset.stationName ?? "";
  }

  if (stationChipJp) {
    stationChipJp.textContent =
      selectedOption?.dataset.stationJapanese ?? "";
  }

  // A station being edited is locked; it cannot be swapped.
  if (stationChipClear) {
    stationChipClear.hidden = stationSelect.disabled;
  }

  if (stationPickerSelected) {
    stationPickerSelected.textContent = "";
  }

  filterStationPicker();
};

const openModal = () => {
  if (!modal) return;

  modal.hidden = false;
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
};

const closeModal = () => {
  if (!modal) return;

  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
};

const resetModalForAdd = () => {
  if (
    !assignmentForm ||
    !stationSelect ||
    !hiddenStationId ||
    !floorSelect ||
    !exitSelect ||
    !locationSelect ||
    !walkingInput ||
    !orderInput
  ) {
    return;
  }

  assignmentForm.reset();

  stationSelect.disabled = false;
  stationSelect.name = "station_id";

  hiddenStationId.disabled = true;
  hiddenStationId.value = "";

  Array.from(stationSelect.options).forEach((option) => {
    option.disabled =
      option.dataset.assigned === "true" && option.value !== "";
  });

  stationSelect.value = "";

  if (stationPickerSearch) {
    stationPickerSearch.value = "";
  }

  floorSelect.value = "";
  exitSelect.value = "";
  locationSelect.value = "outside";
  walkingInput.value = "";
  orderInput.value = "0";

  if (modalTitle) {
    modalTitle.textContent = "Add Station";
  }

  if (modalDescription) {
    modalDescription.textContent =
      "Assign this Top Pick to a station.";
  }

  if (modalSubmit) {
    modalSubmit.textContent = "Add Station";
  }

  filterFloorsAndExits(false);
  syncStationPicker();
};

// Search station names in English or Japanese.
stationPickerSearch?.addEventListener(
  "input",
  filterStationPicker,
);

// Select a station by clicking its result.
stationPickerOptions.forEach((option) => {
  option.addEventListener("click", () => {
    if (!stationSelect || stationSelect.disabled) return;

    const stationId = option.dataset.stationId ?? "";

    if (!stationId) return;

    const matchingOption = Array.from(stationSelect.options).find(
      (selectOption) => selectOption.value === stationId,
    );

    if (!matchingOption || matchingOption.disabled) return;

    stationSelect.value = stationId;

    if (stationPickerSearch) {
      stationPickerSearch.value = "";
    }

    syncStationPicker();
    filterFloorsAndExits(true);

    floorSelect?.focus();
  });
});

// Enter picks the first match; arrow keys walk through the results.
stationPickerSearch?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    visiblePickerOptions()[0]?.click();
  } else if (event.key === "ArrowDown") {
    event.preventDefault();
    visiblePickerOptions()[0]?.focus();
  }
});

stationPickerList?.addEventListener("keydown", (event) => {
  const options = visiblePickerOptions();
  const index = options.indexOf(
    document.activeElement as HTMLButtonElement,
  );

  if (index === -1) return;

  if (event.key === "ArrowDown") {
    event.preventDefault();
    options[Math.min(index + 1, options.length - 1)]?.focus();
  } else if (event.key === "ArrowUp") {
    event.preventDefault();

    if (index === 0) {
      stationPickerSearch?.focus();
    } else {
      options[index - 1]?.focus();
    }
  }
});

// Go back to searching after choosing a station by mistake.
stationChipClear?.addEventListener("click", () => {
  if (!stationSelect || stationSelect.disabled) return;

  stationSelect.value = "";

  filterFloorsAndExits(true);
  syncStationPicker();

  stationPickerSearch?.focus();
});

// Prevent submitting without a selected station.
assignmentForm?.addEventListener("submit", (event) => {
  if (!stationSelect) return;

  const stationId = stationSelect.disabled
    ? hiddenStationId?.value
    : stationSelect.value;

  if (!stationId) {
    event.preventDefault();

    if (stationPickerSelected) {
      stationPickerSelected.textContent =
        "Please select a station before saving.";
    }

    stationPickerSearch?.focus();
  }
});

openAddButton?.addEventListener("click", () => {
  resetModalForAdd();
  openModal();
  stationPickerSearch?.focus();
});

closeButtons.forEach((button) => {
  button.addEventListener("click", closeModal);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modal && !modal.hidden) {
    closeModal();
  }
});

stationSelect?.addEventListener("change", () => {
  filterFloorsAndExits(true);
  syncStationPicker();
});

floorSelect?.addEventListener("change", () => {
  filterFloorsAndExits(false);
});

// Edit an existing assignment without changing its station.
document.querySelectorAll(".js-edit-assignment").forEach((element) => {
  const button = element as HTMLButtonElement;

  button.addEventListener("click", () => {
    if (
      !stationSelect ||
      !hiddenStationId ||
      !floorSelect ||
      !exitSelect ||
      !locationSelect ||
      !walkingInput ||
      !orderInput
    ) {
      return;
    }

    resetModalForAdd();

    const stationId = button.dataset.stationId ?? "";

    stationSelect.value = stationId;
    stationSelect.disabled = true;
    stationSelect.removeAttribute("name");

    hiddenStationId.value = stationId;
    hiddenStationId.disabled = false;

    // Editing an existing assignment must allow its current station.
    Array.from(stationSelect.options).forEach((option) => {
      option.disabled = false;
    });

    if (stationPickerSearch) {
      stationPickerSearch.value = "";
    }

    syncStationPicker();
    filterFloorsAndExits(false);

    floorSelect.value = button.dataset.floorId ?? "";
    filterFloorsAndExits(false);

    exitSelect.value = button.dataset.exitId ?? "";
    locationSelect.value = button.dataset.locationType ?? "outside";
    walkingInput.value = button.dataset.walkingMinutes ?? "";
    orderInput.value = button.dataset.sortOrder ?? "0";

    if (modalTitle) {
      modalTitle.textContent = "Edit Station Assignment";
    }

    if (modalDescription) {
      modalDescription.textContent =
        `Update the assignment for ${button.dataset.stationName ?? "this station"}.`;
    }

    if (modalSubmit) {
      modalSubmit.textContent = "Save Changes";
    }

    openModal();
  });
});

// Existing assigned-stations table search remains unchanged.
searchInput?.addEventListener("input", () => {
  const query = searchInput.value.trim().toLowerCase();

  const rows = Array.from(
    document.querySelectorAll(".station-table-row"),
  ) as HTMLElement[];

  let visibleCount = 0;

  rows.forEach((row) => {
    const matches = (row.dataset.search ?? "").includes(query);

    row.hidden = !matches;

    if (matches) {
      visibleCount++;
    }
  });

  if (searchEmpty) {
    searchEmpty.hidden =
      rows.length === 0 || visibleCount > 0;
  }
});

export {};
