import { createTablePager } from "./shared/table-pager";

const modal = document.querySelector<HTMLElement>("#exit-modal");
const form = document.querySelector<HTMLFormElement>("#exit-form");

const actionInput = document.querySelector<HTMLInputElement>("#exit-action");
const idInput = document.querySelector<HTMLInputElement>("#exit-id");
const title = document.querySelector<HTMLElement>("#exit-modal-title");
const submitButton = document.querySelector<HTMLButtonElement>("#exit-submit");

const colorPicker =
  document.querySelector<HTMLInputElement>("#exit-color-picker");
const colorText =
  document.querySelector<HTMLInputElement>("#exit-color-code");
const colorClear =
  document.querySelector<HTMLButtonElement>("#exit-color-clear");
const sortOrderInput =
  document.querySelector<HTMLInputElement>("#exit-sort-order");

const DEFAULT_COLOR = "#2563EB";
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

/* ========================================
   Add / edit dialog
======================================== */

function setField(name: string, value: string): void {
  const field = form?.elements.namedItem(name) as
    | HTMLInputElement
    | HTMLSelectElement
    | HTMLTextAreaElement
    | null;

  if (field) field.value = value;
}

function syncPickerFromText(): void {
  if (!colorPicker || !colorText) return;

  colorPicker.value = HEX_COLOR.test(colorText.value.trim())
    ? colorText.value.trim()
    : DEFAULT_COLOR;
}

function openModal(edit = false, button?: HTMLButtonElement): void {
  if (!modal || !form) return;

  form.reset();

  if (actionInput) actionInput.value = edit ? "update" : "create";
  if (idInput) idInput.value = edit ? (button?.dataset.id ?? "") : "";
  if (title) title.textContent = edit ? "Edit Exit" : "Add Exit";

  if (submitButton) {
    submitButton.textContent = edit ? "Update Exit" : "Add Exit";
  }

  // form.reset() restores the server-rendered values, so set them explicitly.
  setField("floor_id", edit ? (button?.dataset.floorId ?? "") : "");
  setField("name", edit ? (button?.dataset.name ?? "") : "");
  setField("code", edit ? (button?.dataset.code ?? "") : "");
  setField("color_code", edit ? (button?.dataset.colorCode ?? "") : "");
  setField("description", edit ? (button?.dataset.description ?? "") : "");
  setField(
    "sort_order",
    edit
      ? (button?.dataset.sortOrder ?? "0")
      : (sortOrderInput?.dataset.default ?? "1"),
  );

  syncPickerFromText();

  modal.hidden = false;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("admin-modal-open");

  (form.elements.namedItem("name") as HTMLInputElement | null)?.focus();
}

function closeModal(): void {
  if (!modal) return;

  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("admin-modal-open");

  window.setTimeout(() => {
    if (!modal.classList.contains("is-open")) {
      modal.hidden = true;
    }
  }, 150);
}

document
  .querySelector("#open-add-exit")
  ?.addEventListener("click", () => openModal());

document
  .querySelectorAll<HTMLButtonElement>("[data-edit-exit]")
  .forEach((button) => {
    button.addEventListener("click", () => openModal(true, button));
  });

document
  .querySelectorAll<HTMLElement>("[data-close-exit-modal]")
  .forEach((element) => element.addEventListener("click", closeModal));

document
  .querySelector("#cancel-exit-form")
  ?.addEventListener("click", closeModal);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modal && !modal.hidden) {
    closeModal();
  }
});

/* ========================================
   Color picker <-> HEX field
======================================== */

colorPicker?.addEventListener("input", () => {
  if (colorText) colorText.value = colorPicker.value.toUpperCase();
});

colorText?.addEventListener("input", syncPickerFromText);

colorClear?.addEventListener("click", () => {
  if (colorText) colorText.value = "";
  syncPickerFromText();
});

/* ========================================
   Delete confirmation
======================================== */

const deleteId = document.querySelector<HTMLInputElement>("#delete-exit-id");
const deleteDialog =
  document.querySelector<HTMLElement>("#delete-exit-dialog");

document
  .querySelectorAll<HTMLButtonElement>(".js-delete-exit")
  .forEach((button) => {
    button.addEventListener("click", () => {
      if (deleteId) deleteId.value = button.dataset.exitId ?? "";

      if (deleteDialog) {
        const name =
          deleteDialog.querySelector<HTMLElement>(".common-dialog-name");

        if (name) name.textContent = button.dataset.exitName ?? "";

        deleteDialog.dispatchEvent(new Event("dialog:open"));
      }
    });
  });

/* ========================================
   Search + pagination
======================================== */

const tableBody = document.querySelector<HTMLElement>(
  "#station-exits tbody",
);

if (tableBody) {
  createTablePager({
    body: tableBody,
    rowSelector: "[data-exit-row]",
    pageSize: 10,
    noun: "exits",
    search: document.querySelector<HTMLInputElement>("#exit-search"),
    pageSizeSelect: document.querySelector(
      "#exit-page-size",
    ) as HTMLSelectElement | null,
    info: document.querySelector<HTMLElement>("#exit-page-info"),
    nav: document.querySelector<HTMLElement>("#exit-page-nav"),
    count: document.querySelector<HTMLElement>("#exit-results-count"),
    noResults: document.querySelector<HTMLElement>("#exit-no-results"),
  });
}

export {};
