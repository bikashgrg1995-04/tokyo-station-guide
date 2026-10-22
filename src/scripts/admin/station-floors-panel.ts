
const modal = document.querySelector<HTMLElement>("#floor-modal");
const form = document.querySelector<HTMLFormElement>("#floor-form");

const actionInput = document.querySelector<HTMLInputElement>("#floor-action");
const idInput = document.querySelector<HTMLInputElement>("#floor-id");
const title = document.querySelector<HTMLElement>("#floor-modal-title");
const submitButton =
  document.querySelector<HTMLButtonElement>("#floor-submit");

const search = document.querySelector<HTMLInputElement>("#floor-search");
const pageSizeSelect =
  document.querySelector("#floor-page-size") as HTMLSelectElement | null;

const rows = Array.from(
  document.querySelectorAll<HTMLTableRowElement>("[data-floor-row]"),
);

const pageInfo = document.querySelector<HTMLElement>("#floor-page-info");
const resultsCount =
  document.querySelector<HTMLElement>("#floor-results-count");
const noResults = document.querySelector<HTMLElement>("#floor-no-results");
const prevButton = document.querySelector<HTMLButtonElement>("#floor-prev");
const nextButton = document.querySelector<HTMLButtonElement>("#floor-next");

const deleteId =
  document.querySelector<HTMLInputElement>("#delete-floor-id");
const deleteDialog =
  document.querySelector<HTMLElement>("#delete-floor-dialog");

let currentPage = 1;

function openModal(edit = false, button?: HTMLButtonElement) {
  if (!modal || !form) return;

  form.reset();

  if (actionInput) actionInput.value = edit ? "update" : "create";
  if (idInput) idInput.value = edit ? button?.dataset.id ?? "" : "";

  if (title) title.textContent = edit ? "Edit Floor" : "Add Floor";

  if (submitButton) {
    submitButton.textContent = edit ? "Update Floor" : "Add Floor";
  }

  if (edit && button) {
    const values: Record<string, string | undefined> = {
      name: button.dataset.name,
      name_japanese: button.dataset.nameJapanese,
      floor_order: button.dataset.floorOrder,
    };

    for (const [name, value] of Object.entries(values)) {
      const field = form.elements.namedItem(name) as
        | HTMLInputElement
        | HTMLSelectElement
        | HTMLTextAreaElement
        | null;

      if (field) field.value = value ?? "";
    }
  }

  modal.hidden = false;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("admin-modal-open");

  (
    form.elements.namedItem("name") as HTMLInputElement | null
  )?.focus();
}

function closeModal() {
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

document.querySelector("#open-add-floor")?.addEventListener("click", () => {
  openModal();
});

document
  .querySelectorAll<HTMLButtonElement>("[data-edit-floor]")
  .forEach((button) => {
    button.addEventListener("click", () => openModal(true, button));
  });

document
  .querySelectorAll<HTMLElement>("[data-close-floor-modal]")
  .forEach((element) => {
    element.addEventListener("click", closeModal);
  });

document.querySelector("#cancel-floor-form")?.addEventListener("click", closeModal);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modal && !modal.hidden) {
    closeModal();
  }
});

document
  .querySelectorAll<HTMLButtonElement>(".js-delete-floor")
  .forEach((button) => {
    button.addEventListener("click", () => {
      if (deleteId) {
        deleteId.value = button.dataset.floorId ?? "";
      }

      if (deleteDialog) {
        const name =
          deleteDialog.querySelector<HTMLElement>(".common-dialog-name");

        if (name) {
          name.textContent = button.dataset.floorName ?? "";
        }

        deleteDialog.dispatchEvent(new Event("dialog:open"));
      }
    });
  });

function renderPage() {
  const query = search?.value.trim().toLowerCase() ?? "";

  const filteredRows = rows.filter((row) =>
    (row.dataset.search ?? "").includes(query),
  );

  const pageSize = Number(pageSizeSelect?.value ?? 10);
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));

  currentPage = Math.min(Math.max(currentPage, 1), pageCount);

  const start = (currentPage - 1) * pageSize;
  const end = Math.min(start + pageSize, filteredRows.length);

  rows.forEach((row) => {
    row.hidden = true;
  });

  filteredRows.slice(start, end).forEach((row) => {
    row.hidden = false;
  });

  if (pageInfo) {
    pageInfo.textContent = filteredRows.length
      ? `Showing ${start + 1}–${end} of ${filteredRows.length}`
      : "Showing 0 results";
  }

  if (resultsCount) {
    resultsCount.textContent = `${filteredRows.length} matching floors`;
  }

  if (noResults) {
    noResults.hidden = filteredRows.length > 0;
  }

  if (prevButton) prevButton.disabled = currentPage <= 1;
  if (nextButton) nextButton.disabled = currentPage >= pageCount;
}

search?.addEventListener("input", () => {
  currentPage = 1;
  renderPage();
});

pageSizeSelect?.addEventListener("change", () => {
  currentPage = 1;
  renderPage();
});

prevButton?.addEventListener("click", () => {
  currentPage--;
  renderPage();
});

nextButton?.addEventListener("click", () => {
  currentPage++;
  renderPage();
});

renderPage();

import { initBulkSelect } from "./shared/bulk-select";

initBulkSelect({
  rows: "[data-floor-row]",
  searchId: "floor-search",
  formId: "bulk-delete-floor-form",
  dialogId: "bulk-delete-floor-dialog",
  idField: "floor_id",
  noun: ["floor", "floors"],
});

export {};
