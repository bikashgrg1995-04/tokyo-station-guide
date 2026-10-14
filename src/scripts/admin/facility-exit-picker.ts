
(() => {
  const modal = document.querySelector<HTMLElement>(
    "#facility-exit-picker-modal",
  );

  if (!modal) return;

  const options = Array.from(
    modal.querySelectorAll<HTMLInputElement>(
      "[data-facility-exit-option]",
    ),
  );

  const filters = Array.from(
    modal.querySelectorAll<HTMLButtonElement>(
      "[data-exit-floor-filter]",
    ),
  );

  const countElement = modal.querySelector<HTMLElement>(
    "[data-facility-exit-selection-count]",
  );

  const applyButton = modal.querySelector<HTMLButtonElement>(
    "[data-save-facility-exits]",
  );

  let activeRow: HTMLTableRowElement | null = null;
  let originalSelection: string[] = [];

  const getHiddenInput = (
    row: HTMLTableRowElement,
  ): HTMLInputElement | null =>
    row.querySelector<HTMLInputElement>(
      "[data-facility-exit-ids]",
    );

  const readSelection = (
    input: HTMLInputElement | null,
  ): string[] => {
    if (!input) return [];

    try {
      const parsed: unknown = JSON.parse(input.value);

      if (!Array.isArray(parsed)) return [];

      return parsed
        .filter(
          (id): id is number | string =>
            typeof id === "number" || typeof id === "string",
        )
        .map(String);
    } catch {
      return [];
    }
  };

  const getSelectedIds = (): string[] =>
    options
      .filter((option) => option.checked)
      .map((option) => option.value);

  const updateCount = (): void => {
    const count = getSelectedIds().length;

    if (countElement) {
      countElement.textContent =
        `${count} ${count === 1 ? "exit" : "exits"} selected`;
    }
  };

  const applyFloorFilter = (floorId: string): void => {
    filters.forEach((filter) => {
      const active = filter.dataset.exitFloorFilter === floorId;

      filter.classList.toggle("active", active);
      filter.setAttribute("aria-pressed", String(active));
    });

    options.forEach((option) => {
      const optionRow = option.closest<HTMLElement>(
        "[data-exit-floor]",
      );

      if (!optionRow) return;

      optionRow.hidden =
        floorId !== "all" &&
        optionRow.dataset.exitFloor !== floorId;
    });
  };

  const openModal = (row: HTMLTableRowElement): void => {
    activeRow = row;

    const hiddenInput = getHiddenInput(row);
    originalSelection = readSelection(hiddenInput);

    options.forEach((option) => {
      option.checked = originalSelection.includes(option.value);
    });

    applyFloorFilter("all");
    updateCount();

    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");

    options[0]?.focus();
  };

  const closeModal = (): void => {
    // Cancel/close restores the selection from when the modal opened.
    options.forEach((option) => {
      option.checked = originalSelection.includes(option.value);
    });

    updateCount();

    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    activeRow = null;
  };

  const createPill = (option: HTMLInputElement): HTMLSpanElement => {
    const pill = document.createElement("span");
    pill.className = "facility-exit-pill";

    const label = option.closest<HTMLLabelElement>(
      ".facility-exit-picker-option",
    );

    const name = label
      ?.querySelector("strong")
      ?.textContent?.trim();

    const floor = label
      ?.querySelector("small")
      ?.textContent?.trim();

    pill.textContent = name ?? `Exit ${option.value}`;
    pill.title = floor ?? "";

    return pill;
  };

  const applySelection = (): void => {
    if (!activeRow) return;

    const hiddenInput = getHiddenInput(activeRow);

    if (!hiddenInput) {
      closeModal();
      return;
    }

    const selectedIds = getSelectedIds();

    hiddenInput.value = JSON.stringify(
      selectedIds.map(Number),
    );

    const pillContainer = activeRow.querySelector<HTMLElement>(
      ".facility-exit-pills",
    );

    if (pillContainer) {
      pillContainer.replaceChildren();

      // Pills are clipped to one line in the table, so list them all here.
      pillContainer.title = selectedIds
        .map(
          (id) =>
            options
              .find((item) => item.value === id)
              ?.closest(".facility-exit-picker-option")
              ?.querySelector("strong")
              ?.textContent?.trim() ?? "",
        )
        .filter(Boolean)
        .join(", ");

      if (selectedIds.length === 0) {
        const empty = document.createElement("span");
        empty.className = "facility-exit-empty";
        empty.textContent = "No exits assigned";
        pillContainer.appendChild(empty);
      } else {
        selectedIds.forEach((id) => {
          const option = options.find(
            (item) => item.value === id,
          );

          if (option) {
            pillContainer.appendChild(createPill(option));
          }
        });
      }
    }

    // Keep the new selection if the user reopens the modal.
    originalSelection = [...selectedIds];

    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    activeRow = null;
  };

  // Open the picker for the facility row that was clicked.
  document.addEventListener("click", (event: MouseEvent) => {
    const target = event.target;

    if (!(target instanceof Element)) return;

    const button = target.closest<HTMLButtonElement>(
      "[data-open-facility-exits]",
    );

    if (!button) return;

    const row = button.closest<HTMLTableRowElement>("tr");

    if (!row || !getHiddenInput(row)) return;

    event.preventDefault();
    openModal(row);
  });

  // Filter exits by floor.
  filters.forEach((filter) => {
    filter.addEventListener("click", () => {
      applyFloorFilter(filter.dataset.exitFloorFilter ?? "all");
    });
  });

  // Keep the selection counter updated.
  options.forEach((option) => {
    option.addEventListener("change", updateCount);
  });

  // Apply selected exits to the active facility row.
  applyButton?.addEventListener("click", applySelection);

  // Close and cancel buttons, including the backdrop.
  modal.addEventListener("click", (event: MouseEvent) => {
    const target = event.target;

    if (!(target instanceof Element)) return;

    if (target.closest("[data-close-facility-exit-picker]")) {
      closeModal();
    }
  });

  // Escape closes the modal without applying uncommitted changes.
  document.addEventListener("keydown", (event: KeyboardEvent) => {
    if (event.key === "Escape" && !modal.hidden) {
      closeModal();
    }
  });
})();
