

const modal = document.querySelector<HTMLElement>("#platform-modal");
const form = document.querySelector<HTMLFormElement>("#platform-form");

const actionInput = document.querySelector<HTMLInputElement>("#platform-action");
const idInput = document.querySelector<HTMLInputElement>("#platform-id");
const title = document.querySelector<HTMLElement>("#platform-modal-title");
const submitButton = document.querySelector<HTMLButtonElement>("#platform-submit");

const search = document.querySelector<HTMLInputElement>("#platform-search");
const pageSizeSelect = document.querySelector("#platform-page-size") as HTMLSelectElement | null;
const rows = Array.from(
  document.querySelectorAll<HTMLTableRowElement>("[data-platform-row]"),
);

const pageInfo = document.querySelector<HTMLElement>("#platform-page-info");
const resultsCount = document.querySelector<HTMLElement>("#platform-results-count");
const noResults = document.querySelector<HTMLElement>("#platform-no-results");
const prevButton = document.querySelector<HTMLButtonElement>("#platform-prev");
const nextButton = document.querySelector<HTMLButtonElement>("#platform-next");

const deleteId = document.querySelector<HTMLInputElement>("#delete-platform-id");
const deleteDialog = document.querySelector<HTMLElement>("#delete-platform-dialog");

let currentPage = 1;

function openModal(edit = false, button?: HTMLButtonElement) {
  if (!modal || !form) return;

  form.reset();

  if (actionInput) actionInput.value = edit ? "update" : "create";
  if (idInput) idInput.value = edit ? button?.dataset.id ?? "" : "";
  if (title) title.textContent = edit ? "Edit Platform" : "Add Platform";
  if (submitButton) {
    submitButton.textContent = edit ? "Update Platform" : "Add Platform";
  }

  if (edit && button) {
    const values: Record<string, string | undefined> = {
      platform_number: button.dataset.number,
      destinations: button.dataset.destinations,
      line_id: button.dataset.lineId,
      notes: button.dataset.notes,
      sort_order: button.dataset.sortOrder,
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

  (form.elements.namedItem("platform_number") as HTMLInputElement | null)?.focus();
}

function closeModal() {
  if (!modal) return;

  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("admin-modal-open");

  window.setTimeout(() => {
    if (!modal.classList.contains("is-open")) modal.hidden = true;
  }, 150);
}

document.querySelector("#open-add-platform")?.addEventListener("click", () => {
  openModal();
});

document.querySelectorAll<HTMLButtonElement>("[data-edit-platform]").forEach((button) => {
  button.addEventListener("click", () => openModal(true, button));
});

document.querySelectorAll<HTMLElement>("[data-close-platform-modal]").forEach((element) => {
  element.addEventListener("click", closeModal);
});

document.querySelector("#cancel-platform-form")?.addEventListener("click", closeModal);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modal && !modal.hidden) closeModal();
});

document.querySelectorAll<HTMLButtonElement>(".js-delete-platform").forEach((button) => {
  button.addEventListener("click", () => {
    if (deleteId) deleteId.value = button.dataset.platformId ?? "";

    if (deleteDialog) {
      const name = deleteDialog.querySelector<HTMLElement>(".common-dialog-name");
      if (name) name.textContent = button.dataset.platformName ?? "";

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
    resultsCount.textContent = `${filteredRows.length} • Matching Platforms`;
  }

  if (noResults) noResults.hidden = filteredRows.length > 0;

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

export {};
