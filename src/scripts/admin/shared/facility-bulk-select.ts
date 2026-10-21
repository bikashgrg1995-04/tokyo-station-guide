/**
 * Station edit > Facilities: tick one or many rows (or all of them at once)
 * and delete them together. "Select all" covers every page of the table, but
 * only the rows the current search and floor filter show.
 */
import { rowSearchText } from "./table-pager";

export function initializeFacilityBulkSelect(): void {
  const bodyEl = document.getElementById("station-facilities-body");
  const selectAllEl = document.getElementById("facility-select-all");
  const deleteEl = document.getElementById("delete-selected-facilities-button");
  const dialogEl = document.getElementById("delete-selected-facilities-dialog");
  const floorFilter = document.getElementById("station-facility-floor-filter");
  const searchInput = document.querySelector<HTMLInputElement>(
    "#station-facilities-paged [data-paged-toolbar] input",
  );

  if (!bodyEl || !selectAllEl || !deleteEl || !dialogEl) return;

  const body = bodyEl as HTMLTableSectionElement;
  const selectAll = selectAllEl as HTMLInputElement;
  const deleteButton = deleteEl as HTMLButtonElement;
  const dialog = dialogEl as HTMLElement;

  const rows = () =>
    Array.from(body.querySelectorAll<HTMLTableRowElement>("tr[data-facility-row]"));

  const boxOf = (row: HTMLElement) =>
    row.querySelector<HTMLInputElement>("input[data-facility-select]");

  /** Rows that match the floor filter and the search box (on every page). */
  function matching(): HTMLTableRowElement[] {
    const floor =
      floorFilter instanceof HTMLSelectElement ? floorFilter.value : "all";
    const query = (searchInput?.value ?? "").trim().toLowerCase();

    return rows().filter(
      (row) =>
        (floor === "all" || (row.dataset.floorId ?? "") === floor) &&
        (!query || rowSearchText(row).includes(query)),
    );
  }

  const selected = () => rows().filter((row) => boxOf(row)?.checked);

  function sync(): void {
    const chosen = selected();
    const visible = matching();
    const chosenVisible = visible.filter((row) => boxOf(row)?.checked);

    selectAll.disabled = visible.length === 0;
    selectAll.checked = visible.length > 0 && chosenVisible.length === visible.length;
    selectAll.indeterminate =
      chosenVisible.length > 0 && chosenVisible.length < visible.length;

    deleteButton.classList.toggle("is-visible", chosen.length > 0);
    deleteButton.textContent =
      chosen.length > 1 ? `Delete (${chosen.length})` : "Delete";
  }

  selectAll.addEventListener("change", () => {
    const on = selectAll.checked;

    rows().forEach((row) => {
      const box = boxOf(row);
      if (box) box.checked = false;
    });

    if (on) {
      matching().forEach((row) => {
        const box = boxOf(row);
        if (box) box.checked = true;
      });
    }

    sync();
  });

  body.addEventListener("change", (event) => {
    if ((event.target as HTMLElement).closest("input[data-facility-select]")) {
      sync();
    }
  });

  // A row the filter or search hides must not stay ticked (it could be deleted unseen).
  function dropHidden(): void {
    const visible = new Set(matching());

    rows().forEach((row) => {
      const box = boxOf(row);
      if (box && !visible.has(row)) box.checked = false;
    });

    sync();
  }

  floorFilter?.addEventListener("change", dropHidden);
  searchInput?.addEventListener("input", dropHidden);

  // Rows added or removed (Add dialog, Remove button).
  new MutationObserver(sync).observe(body, { childList: true });

  deleteButton.addEventListener("click", () => {
    const chosen = selected();
    if (chosen.length === 0) return;

    const text = dialog.querySelector("p");
    if (text) {
      text.textContent =
        chosen.length === 1
          ? "Are you sure you want to remove the selected facility entry?"
          : `Are you sure you want to remove these ${chosen.length} facility entries?`;
    }

    dialog.dispatchEvent(new CustomEvent("dialog:open"));
  });

  dialog.addEventListener("confirm", () => {
    selected().forEach((row) => row.remove());
    sync();
  });

  sync();
}
