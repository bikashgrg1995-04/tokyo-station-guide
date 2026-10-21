// Bulk import (Settings page): read the Excel file, show a preview, then save.

import { readXlsx, type SheetRows } from "./shared/xlsx-reader";

interface Preview {
  ok: boolean;
  summary: { sheet: string; created: number; updated: number; unchanged: number; deleted: number }[];
  errors: { sheet: string; row: number; message: string }[];
  totalErrors: number;
  warnings: string[];
  deletions: { sheet: string; total: number; keys: string[] }[];
}

const $ = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;

const fileInput = $<HTMLInputElement>("import-file");
const dropZone = $<HTMLLabelElement>("import-drop");
const fileName = $<HTMLElement>("import-file-name");
const statusBox = $<HTMLElement>("import-status");
const resultBox = $<HTMLElement>("import-result");
const applyButton = $<HTMLButtonElement>("import-apply");
const resetButton = $<HTMLButtonElement>("import-reset");
const syncBox = $<HTMLInputElement>("import-delete-missing");

let sheets: SheetRows | null = null;
let busy = false;
let lastTotals = { created: 0, updated: 0, deleted: 0 };

function show(el: HTMLElement, visible: boolean) {
  el.hidden = !visible;
}

function clear(el: HTMLElement) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

function node<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function setStatus(message: string, kind: "info" | "error" | "success" = "info") {
  statusBox.textContent = message;
  statusBox.className = `import-status import-status-${kind}`;
  show(statusBox, message !== "");
}

function sheetLabel(name: string) {
  return name.replace(/_/g, " ");
}

function chip(kind: string, count: number, label: string) {
  const el = node("span", `import-chip import-chip-${kind}${count === 0 ? " is-zero" : ""}`);
  el.appendChild(node("b", "", String(count)));
  el.appendChild(document.createTextNode(` ${label}`));
  return el;
}

function renderPreview(preview: Preview, applied: boolean) {
  clear(resultBox);

  const totals = { created: 0, updated: 0, unchanged: 0, deleted: 0 };
  preview.summary.forEach((s) => {
    totals.created += s.created;
    totals.updated += s.updated;
    totals.unchanged += s.unchanged;
    totals.deleted += s.deleted;
  });
  lastTotals = totals;

  if (preview.summary.length > 0) {
    const chips = node("div", "import-chips");
    chips.appendChild(chip("new", totals.created, applied ? "created" : "new"));
    chips.appendChild(chip("upd", totals.updated, "updated"));
    chips.appendChild(chip("del", totals.deleted, "deleted"));
    chips.appendChild(chip("same", totals.unchanged, "unchanged"));
    resultBox.appendChild(chips);

    const details = node("details", "import-details");
    details.appendChild(node("summary", "", "Details by sheet"));

    const table = node("table", "import-table");
    const head = node("thead");
    const headRow = node("tr");
    ["Sheet", "New", "Upd", "Del", "Same"].forEach((label) =>
      headRow.appendChild(node("th", "", label)),
    );
    head.appendChild(headRow);
    table.appendChild(head);

    const body = node("tbody");
    preview.summary.forEach((s) => {
      const tr = node("tr");
      tr.appendChild(node("td", "", sheetLabel(s.sheet)));
      tr.appendChild(node("td", "", String(s.created)));
      tr.appendChild(node("td", "", String(s.updated)));
      tr.appendChild(node("td", s.deleted > 0 ? "import-del" : "import-muted", String(s.deleted)));
      tr.appendChild(node("td", "import-muted", String(s.unchanged)));
      body.appendChild(tr);
    });
    table.appendChild(body);

    const wrap = node("div", "import-table-wrap");
    wrap.appendChild(table);
    details.appendChild(wrap);
    resultBox.appendChild(details);
  }

  if (preview.deletions.length > 0) {
    const box = node("details", "import-details import-details-del");
    box.open = !applied;
    box.appendChild(node("summary", "", `Rows that ${applied ? "were" : "will be"} deleted`));
    const list = node("ul", "import-list");
    preview.deletions.forEach((d) => {
      const li = node("li");
      li.appendChild(node("strong", "", `${sheetLabel(d.sheet)} (${d.total}): `));
      li.appendChild(
        document.createTextNode(
          d.keys.join(", ") + (d.total > d.keys.length ? ` …+${d.total - d.keys.length}` : ""),
        ),
      );
      list.appendChild(li);
    });
    box.appendChild(list);
    resultBox.appendChild(box);
  }

  if (preview.warnings.length > 0) {
    const list = node("ul", "import-warnings");
    preview.warnings.forEach((w) => list.appendChild(node("li", "", w)));
    resultBox.appendChild(list);
  }

  if (preview.errors.length > 0) {
    resultBox.appendChild(
      node("h4", "import-errors-title", `${preview.totalErrors} problem(s) to fix`),
    );
    const list = node("ul", "import-errors");
    preview.errors.forEach((e) => {
      const li = node("li");
      const where =
        e.row > 0 ? `${sheetLabel(e.sheet)} · row ${e.row}` : sheetLabel(e.sheet);
      li.appendChild(node("strong", "", where));
      li.appendChild(document.createTextNode(` — ${e.message}`));
      list.appendChild(li);
    });
    resultBox.appendChild(list);
    if (preview.totalErrors > preview.errors.length) {
      resultBox.appendChild(
        node("p", "import-more", `…and ${preview.totalErrors - preview.errors.length} more.`),
      );
    }
  }

  show(resultBox, true);
}

async function send(mode: "preview" | "apply") {
  const response = await fetch("/api/admin/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode, sheets, deleteMissing: syncBox.checked }),
  });

  const data = (await response.json().catch(() => null)) as {
    ok?: boolean;
    message?: string;
    applied?: boolean;
    preview?: Preview;
  } | null;

  if (!response.ok || !data?.ok) {
    throw new Error(data?.message || "Something went wrong. Please try again.");
  }

  return data as { applied: boolean; preview: Preview };
}

/** Checks the loaded file against the database and shows the result. */
async function check() {
  setStatus("Checking the data…");
  const { preview } = await send("preview");

  renderPreview(preview, false);
  show(resetButton, true);

  const changes = lastTotals.created + lastTotals.updated + lastTotals.deleted;

  if (preview.ok && changes > 0) {
    setStatus("The file looks good. Check the numbers, then press Import.", "success");
    applyButton.disabled = false;
  } else if (preview.ok) {
    setStatus("Everything in this file is already saved. Nothing to import.", "info");
    applyButton.disabled = true;
  } else {
    setStatus("Nothing was saved. Fix the problems below in Excel and upload the file again.", "error");
    applyButton.disabled = true;
  }
}

async function handleFile(file: File) {
  if (busy) return;
  busy = true;
  applyButton.disabled = true;
  show(resultBox, false);
  show(resetButton, false);
  fileName.textContent = file.name;

  try {
    if (!/\.xlsx$/i.test(file.name)) {
      throw new Error("Please choose an Excel (.xlsx) file. Download the template above.");
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error("The file is too large (5 MB maximum).");
    }

    setStatus("Reading the file…");
    sheets = await readXlsx(file);
    await check();
  } catch (error) {
    sheets = null;
    setStatus(error instanceof Error ? error.message : "Could not read the file.", "error");
    show(resetButton, true);
  } finally {
    busy = false;
  }
}

async function handleApply() {
  if (busy || !sheets) return;
  busy = true;
  applyButton.disabled = true;
  setStatus("Importing…");

  try {
    const { applied, preview } = await send("apply");

    renderPreview(preview, applied);

    if (applied) {
      setStatus("Import finished. The data is saved.", "success");
      sheets = null;
    } else {
      setStatus("Nothing was saved. Fix the problems below and upload the file again.", "error");
    }
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "The import failed.", "error");
    applyButton.disabled = false;
  } finally {
    busy = false;
  }
}

function reset() {
  sheets = null;
  fileInput.value = "";
  fileName.textContent = "";
  applyButton.disabled = true;
  show(resultBox, false);
  show(resetButton, false);
  setStatus("");
}

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (file) void handleFile(file);
});

// Switching sync mode re-checks the same file.
syncBox.addEventListener("change", () => {
  if (!sheets || busy) return;
  busy = true;
  applyButton.disabled = true;
  check()
    .catch((error) =>
      setStatus(error instanceof Error ? error.message : "Could not check the file.", "error"),
    )
    .finally(() => {
      busy = false;
    });
});

["dragenter", "dragover"].forEach((type) =>
  dropZone.addEventListener(type, (event) => {
    event.preventDefault();
    dropZone.classList.add("is-dragging");
  }),
);

["dragleave", "drop"].forEach((type) =>
  dropZone.addEventListener(type, (event) => {
    event.preventDefault();
    dropZone.classList.remove("is-dragging");
  }),
);

dropZone.addEventListener("drop", (event) => {
  const file = (event as DragEvent).dataTransfer?.files?.[0];
  if (file) void handleFile(file);
});

applyButton.addEventListener("click", () => {
  const { created, updated, deleted } = lastTotals;
  const lines = [`Save this data to the database now?`, `${created} new, ${updated} updated.`];
  if (deleted > 0) {
    lines.push(`${deleted} row(s) will be DELETED (they are not in the file). This cannot be undone.`);
  }
  lines.push("Empty cells clear the saved value.");
  if (window.confirm(lines.join("\n"))) {
    void handleApply();
  }
});

resetButton.addEventListener("click", reset);
