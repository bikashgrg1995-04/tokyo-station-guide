const modal = document.querySelector<HTMLElement>("#add-exit-modal");
const openButton = document.querySelector<HTMLButtonElement>("#open-add-exit-button");
const closeButton = document.querySelector<HTMLButtonElement>("#close-add-exit-modal");
const cancelButton = document.querySelector<HTMLButtonElement>("#cancel-add-exits");
const addButton = document.querySelector<HTMLButtonElement>("#add-new-exit");

const floorOptions = document.querySelectorAll<HTMLButtonElement>("[data-exit-floor-option]");
const selectedFloorInput = document.querySelector<HTMLInputElement>("#selected-exit-floor-id");
const nameInput = document.querySelector<HTMLInputElement>("#new-exit-name");
const codeInput = document.querySelector<HTMLInputElement>("#new-exit-code");
const descriptionInput = document.querySelector<HTMLTextAreaElement>("#new-exit-description");
const colorPicker = document.querySelector<HTMLInputElement>("#new-exit-color-picker");
const colorCodeInput = document.querySelector<HTMLInputElement>("#new-exit-color-code");
const clearColorButton = document.querySelector<HTMLButtonElement>("#clear-new-exit-color");
const errorElement = document.querySelector<HTMLElement>("#exit-modal-error");
const tableBody = document.querySelector<HTMLTableSectionElement>("#station-exits-body");
const emptyRow = document.querySelector<HTMLTableRowElement>("#station-exits-empty-row");

if (
  modal &&
  openButton &&
  addButton &&
  selectedFloorInput &&
  nameInput &&
  codeInput &&
  descriptionInput &&
  colorPicker &&
  colorCodeInput &&
  tableBody
) {
  const setError = (message: string): void => {
    if (!errorElement) return;

    errorElement.textContent = message;
    errorElement.hidden = message.length === 0;
  };

  const openModal = (): void => {
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    setError("");
    nameInput.focus();
  };

  const closeModal = (): void => {
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    setError("");
    openButton.focus();
  };

  const updateAddButton = (): void => {
    const floorSelected = selectedFloorInput.value !== "";
    const nameValid = nameInput.value.trim().length > 0;
    const color = colorCodeInput.value.trim();
    const colorValid = color === "" || /^#[0-9a-fA-F]{6}$/.test(color);

    addButton.disabled = !floorSelected || !nameValid || !colorValid;
  };

  const resetForm = (): void => {
    selectedFloorInput.value = "";

    floorOptions.forEach((button) => {
      button.setAttribute("aria-pressed", "false");
    });

    nameInput.value = "";
    codeInput.value = "";
    descriptionInput.value = "";
    colorCodeInput.value = "";
    colorPicker.value = "#2563EB";

    updateAddButton();
    setError("");
  };

  const createCell = (
    content: HTMLElement | string,
  ): HTMLTableCellElement => {
    const cell: HTMLTableCellElement = document.createElement("td");

    if (typeof content === "string") {
      cell.textContent = content;
    } else {
      cell.appendChild(content);
    }

    return cell;
  };

  const createHiddenInput = (
    name: string,
    value: string,
  ): HTMLInputElement => {
    const input: HTMLInputElement = document.createElement("input");

    input.type = "hidden";
    input.name = name;
    input.value = value;

    return input;
  };

  const createTextInput = (
    name: string,
    value: string,
    label: string,
    maxLength: number,
  ): HTMLInputElement => {
    const input: HTMLInputElement = document.createElement("input");

    input.type = "text";
    input.name = name;
    input.value = value;
    input.maxLength = maxLength;
    input.setAttribute("aria-label", label);

    return input;
  };

  const createExitRow = (
    floorId: string,
    floorName: string,
    name: string,
    code: string,
    description: string,
    colorCode: string,
  ): HTMLTableRowElement => {
    const row: HTMLTableRowElement = document.createElement("tr");

    row.dataset.exitRow = "";

    const nameCell: HTMLTableCellElement = document.createElement("td");

    nameCell.appendChild(createHiddenInput("exit_entry_id", ""));
    nameCell.appendChild(
      createHiddenInput("exit_entry_floor_id", floorId),
    );
    nameCell.appendChild(
      createHiddenInput(
        "exit_entry_sort_order",
        String(tableBody.querySelectorAll("[data-exit-row]").length + 1),
      ),
    );
    nameCell.appendChild(
      createTextInput("exit_entry_name", name, `Exit name, ${name}`, 150),
    );

    const floorPill: HTMLSpanElement = document.createElement("span");
    floorPill.className = "admin-floor-pill";
    floorPill.textContent = floorName;

    const floorCell = createCell(floorPill);

    const codeCell = createCell(
      createTextInput("exit_entry_code", code, `Code for ${name}`, 50),
    );

    const colorWrapper: HTMLDivElement = document.createElement("div");
    colorWrapper.className = "exit-color-field";

    const picker: HTMLInputElement = document.createElement("input");
    picker.type = "color";
    picker.value = /^#[0-9a-fA-F]{6}$/.test(colorCode)
      ? colorCode
      : "#2563EB";
    picker.setAttribute("aria-label", `Color picker for ${name}`);
    picker.dataset.exitColorPicker = "";

    const colorText = createTextInput(
      "exit_entry_color_code",
      colorCode,
      `HEX color for ${name}`,
      7,
    );

    colorText.placeholder = "#2563EB";
    colorText.pattern = "^#([0-9a-fA-F]{6})$";
    colorText.dataset.exitColorText = "";

    picker.addEventListener("input", () => {
      colorText.value = picker.value.toUpperCase();
    });

    colorText.addEventListener("input", () => {
      if (/^#[0-9a-fA-F]{6}$/.test(colorText.value)) {
        picker.value = colorText.value;
      }
    });

    colorWrapper.appendChild(picker);
    colorWrapper.appendChild(colorText);

    const colorCell = createCell(colorWrapper);

    const descriptionCell = createCell(
      createTextInput(
        "exit_entry_description",
        description,
        `Description for ${name}`,
        500,
      ),
    );

    const actions: HTMLDivElement = document.createElement("div");
    actions.className = "admin-table-actions";

    const removeButton: HTMLButtonElement =
      document.createElement("button");

    removeButton.type = "button";
    removeButton.className =
      "admin-table-action admin-table-action-delete";
    removeButton.dataset.removeExit = "";
    removeButton.dataset.exitName = name;
    removeButton.textContent = "Remove";

    actions.appendChild(removeButton);

    const actionsCell = createCell(actions);

    row.appendChild(nameCell);
    row.appendChild(floorCell);
    row.appendChild(codeCell);
    row.appendChild(colorCell);
    row.appendChild(descriptionCell);
    row.appendChild(actionsCell);

    return row;
  };

  openButton.addEventListener("click", openModal);

  closeButton?.addEventListener("click", closeModal);
  cancelButton?.addEventListener("click", closeModal);

  modal.addEventListener("click", (event: MouseEvent) => {
    const target = event.target;

    if (
      target instanceof HTMLElement &&
      target.matches("[data-close-add-exit-modal]")
    ) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (event: KeyboardEvent) => {
    if (event.key === "Escape" && !modal.hidden) {
      closeModal();
    }
  });

  floorOptions.forEach((button) => {
    button.addEventListener("click", () => {
      floorOptions.forEach((option) => {
        option.setAttribute("aria-pressed", "false");
      });

      button.setAttribute("aria-pressed", "true");
      selectedFloorInput.value = button.dataset.floorId ?? "";

      updateAddButton();
    });
  });

  nameInput.addEventListener("input", updateAddButton);
  colorCodeInput.addEventListener("input", updateAddButton);

  colorPicker.addEventListener("input", () => {
    colorCodeInput.value = colorPicker.value.toUpperCase();
    updateAddButton();
  });

  clearColorButton?.addEventListener("click", () => {
    colorCodeInput.value = "";
    updateAddButton();
  });

  addButton.addEventListener("click", () => {
    const floorId = selectedFloorInput.value;

    const selectedFloor = Array.from(floorOptions).find(
      (button) => button.dataset.floorId === floorId,
    );

    const name = nameInput.value.trim();
    const code = codeInput.value.trim();
    const description = descriptionInput.value.trim();
    const colorCode = colorCodeInput.value.trim().toUpperCase();

    if (!floorId || !selectedFloor) {
      setError("Please select a floor.");
      return;
    }

    if (!name) {
      setError("Exit name is required.");
      nameInput.focus();
      return;
    }

    if (colorCode && !/^#[0-9A-F]{6}$/.test(colorCode)) {
      setError("Enter a valid HEX color, such as #2563EB.");
      colorCodeInput.focus();
      return;
    }

    const row = createExitRow(
      floorId,
      selectedFloor.textContent?.trim() ?? "Unknown floor",
      name,
      code,
      description,
      colorCode,
    );

    tableBody.insertBefore(row, emptyRow ?? null);

    if (emptyRow) {
      emptyRow.hidden = true;
    }

    resetForm();
    closeModal();
  });

  // Synchronize color pickers and HEX inputs in all exit rows.
  tableBody.addEventListener("input", (event: Event) => {
    const target = event.target;

    if (!(target instanceof HTMLInputElement)) return;

    const row = target.closest<HTMLTableRowElement>("[data-exit-row]");
    if (!row) return;

    const picker = row.querySelector<HTMLInputElement>(
      "[data-exit-color-picker]",
    );
    const text = row.querySelector<HTMLInputElement>(
      "[data-exit-color-text]",
    );

    if (!picker || !text) return;

    if (target === picker) {
      text.value = picker.value.toUpperCase();
    } else if (
      target === text &&
      /^#[0-9a-fA-F]{6}$/.test(text.value)
    ) {
      picker.value = text.value;
    }
  });

  tableBody.addEventListener("click", (event: MouseEvent) => {
    const target = event.target;

    if (!(target instanceof HTMLElement)) return;

    const removeButton = target.closest<HTMLButtonElement>(
      "[data-remove-exit]",
    );

    if (!removeButton) return;

    const row = removeButton.closest<HTMLTableRowElement>(
      "[data-exit-row]",
    );

    if (!row) return;

    row.remove();

    const remainingRows =
      tableBody.querySelectorAll<HTMLTableRowElement>("[data-exit-row]");

    if (emptyRow) {
      emptyRow.hidden = remainingRows.length > 0;
    }

    // Recalculate sort order after removing an exit.
    remainingRows.forEach((exitRow, index) => {
      const sortInput = exitRow.querySelector<HTMLInputElement>(
        'input[name="exit_entry_sort_order"]',
      );

      if (sortInput) {
        sortInput.value = String(index + 1);
      }
    });
  });

  updateAddButton();
}