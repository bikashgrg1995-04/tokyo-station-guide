/**
 * Station platforms / floors / exits: tick one or many rows (or all of them
 * at once) and delete them together. "Select all" covers every page of the
 * table, but only the rows the current search shows.
 *
 * The page posts a hidden form (`<prefix>_action=delete_many` plus one
 * `<prefix>_id` per ticked row) after the confirm dialog.
 */
export interface BulkSelectOptions {
  /** Row selector, e.g. "[data-platform-row]". */
  rows: string;
  /** Search input id (rows carry a lowercase `data-search` text). */
  searchId: string;
  /** Hidden <form> that is submitted by the confirm dialog. */
  formId: string;
  /** Confirm dialog id. */
  dialogId: string;
  /** Name of the id field the server reads, e.g. "platform_id". */
  idField: string;
  /** Singular and plural label, e.g. ["platform", "platforms"]. */
  noun: [string, string];
}

export function initBulkSelect(opts: BulkSelectOptions): void {
  const rows = Array.from(
    document.querySelectorAll<HTMLTableRowElement>(opts.rows),
  );
  const selectAll = document.querySelector<HTMLInputElement>("[data-bulk-all]");
  const deleteButton = document.querySelector<HTMLButtonElement>("[data-bulk-delete]");
  const form = document.getElementById(opts.formId);
  const dialog = document.getElementById(opts.dialogId);
  const search = document.getElementById(opts.searchId) as HTMLInputElement | null;

  if (!selectAll || !deleteButton || !(form instanceof HTMLFormElement) || !dialog) {
    return;
  }

  const boxOf = (row: HTMLElement) =>
    row.querySelector<HTMLInputElement>("input[data-bulk-select]");

  const matching = () => {
    const query = (search?.value ?? "").trim().toLowerCase();
    return rows.filter((row) => !query || (row.dataset.search ?? "").includes(query));
  };

  const selected = () => rows.filter((row) => boxOf(row)?.checked);

  function sync(): void {
    const chosen = selected();
    const visible = matching();
    const chosenVisible = visible.filter((row) => boxOf(row)?.checked);

    selectAll!.disabled = visible.length === 0;
    selectAll!.checked = visible.length > 0 && chosenVisible.length === visible.length;
    selectAll!.indeterminate =
      chosenVisible.length > 0 && chosenVisible.length < visible.length;

    deleteButton!.classList.toggle("is-visible", chosen.length > 0);
    deleteButton!.textContent = chosen.length > 1 ? `Delete (${chosen.length})` : "Delete";
  }

  selectAll.addEventListener("change", () => {
    const on = selectAll.checked;

    rows.forEach((row) => {
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

  rows.forEach((row) => boxOf(row)?.addEventListener("change", sync));

  // A row the search hides must not stay ticked (it could be deleted unseen).
  search?.addEventListener("input", () => {
    const visible = new Set(matching());

    rows.forEach((row) => {
      const box = boxOf(row);
      if (box && !visible.has(row)) box.checked = false;
    });

    sync();
  });

  deleteButton.addEventListener("click", () => {
    const chosen = selected();
    if (chosen.length === 0) return;

    // One hidden input per ticked row, read by the server.
    form.querySelectorAll("input[data-bulk-id]").forEach((el) => el.remove());

    chosen.forEach((row) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = opts.idField;
      input.value = boxOf(row)?.value ?? "";
      input.dataset.bulkId = "1";
      form.appendChild(input);
    });

    const [one, many] = opts.noun;
    const text = dialog.querySelector(".common-dialog-content > p");
    if (text) {
      text.textContent =
        chosen.length === 1
          ? `Are you sure you want to delete the selected ${one}?`
          : `Are you sure you want to delete these ${chosen.length} ${many}?`;
    }

    const name = dialog.querySelector<HTMLElement>(".common-dialog-name");
    if (name) name.textContent = "";

    dialog.dispatchEvent(new Event("dialog:open"));
  });

  sync();
}
