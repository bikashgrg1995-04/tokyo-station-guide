// Bulk import page: read the Excel file, show a preview, then save.

import { readXlsx, type SheetRows } from "./shared/xlsx-reader";

interface Preview {
  ok: boolean;
  summary: { sheet: string; created: number; updated: number }[];
  errors: { sheet: string; row: number; message: string }[];
  totalErrors: number;
  warnings: string[];
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

let sheets: SheetRows | null = null;
let busy = false;

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

function renderPreview(preview: Preview, applied: boolean) {
  clear(resultBox);

  if (preview.summary.length > 0) {
    const table = node("table", "import-table");
    const head = node("thead");
    const headRow = node("tr");
    ["Sheet", applied ? "Created" : "Will create", applied ? "Updated" : "Will update"].forEach(
      (label) => headRow.appendChild(node("th", "", label)),
    );
    head.appendChild(headRow);
    table.appendChild(head);

    const body = node("tbody");
    let created = 0;
    let updated = 0;
    preview.summary.forEach((s) => {
      const tr = node("tr");
      tr.appendChild(node("td", "", sheetLabel(s.sheet)));
      tr.appendChild(node("td", "", String(s.created)));
      tr.appendChild(node("td", "", String(s.updated)));
      body.appendChild(tr);
      created += s.created;
      updated += s.updated;
    });
    const total = node("tr", "import-total");
    total.appendChild(node("td", "", "Total"));
    total.appendChild(node("td", "", String(created)));
    total.appendChild(node("td", "", String(updated)));
    body.appendChild(total);
    table.appendChild(body);

    const wrap = node("div", "import-table-wrap");
    wrap.appendChild(table);
    resultBox.appendChild(wrap);
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
    body: JSON.stringify({ mode, sheets }),
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

    setStatus("Checking the data…");
    const { preview } = await send("preview");

    renderPreview(preview, false);
    show(resetButton, true);

    const rowsToSave = preview.summary.reduce((n, s) => n + s.created + s.updated, 0);

    if (preview.ok && rowsToSave > 0) {
      setStatus("The file looks good. Check the numbers, then press Import.", "success");
      applyButton.disabled = false;
    } else {
      setStatus("Nothing was saved. Fix the problems below in Excel and upload the file again.", "error");
    }
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
  if (window.confirm("Save this data to the database now? Existing rows with the same key will be updated.")) {
    void handleApply();
  }
});

resetButton.addEventListener("click", reset);
