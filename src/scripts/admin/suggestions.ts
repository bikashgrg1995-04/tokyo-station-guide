// Suggestions page: detail dialog and status buttons.

type SuggestionRow = {
  id: number;
  status: "pending" | "approved" | "rejected";
  statusLabel: string;
  stationId: number;
  stationName: string;
  lineName: string | null;
  lineColor: string | null;
  message: string | null;
  submittedAt: string;
  reviewedAt: string | null;
};

const rows: SuggestionRow[] = JSON.parse(
  document.getElementById("suggestions-data")?.textContent || "[]",
);

const byId = new Map(rows.map((row) => [row.id, row]));

const modal = document.querySelector<HTMLDialogElement>("#suggestion-modal")!;
const title = document.querySelector<HTMLElement>("#suggestion-modal-title")!;
const subtitle = document.querySelector<HTMLElement>(
  "#suggestion-modal-subtitle",
)!;
const body = document.querySelector<HTMLElement>("#suggestion-modal-body")!;
const feedback = document.querySelector<HTMLElement>("#suggestion-feedback")!;

const editLink = document.querySelector<HTMLAnchorElement>(
  "#suggestion-edit-station",
)!;
const resolveButton = document.querySelector<HTMLButtonElement>(
  "#suggestion-resolve",
)!;
const dismissButton = document.querySelector<HTMLButtonElement>(
  "#suggestion-dismiss",
)!;
const reopenButton = document.querySelector<HTMLButtonElement>(
  "#suggestion-reopen",
)!;
const deleteButton = document.querySelector<HTMLButtonElement>(
  "#suggestion-delete",
)!;

let active: SuggestionRow | null = null;
let busy = false;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/* Append nodes or text (Element.append is typed for HTMLRewriter in this project). */
function add(parent: Node, ...children: Array<Node | string>) {
  for (const child of children) {
    parent.appendChild(
      typeof child === "string" ? document.createTextNode(child) : child,
    );
  }
}

function detail(label: string, value: string | Node): HTMLElement {
  const box = el("div", "suggestion-detail");
  add(box, el("span", "suggestion-detail-label", label));

  const content = el("div", "suggestion-detail-value");
  add(content, value);
  add(box, content);

  return box;
}

function render(row: SuggestionRow) {
  title.textContent = row.stationName;

  const line = row.lineName;
  subtitle.textContent = line
    ? `${line} · ${row.statusLabel}`
    : row.statusLabel;

  body.replaceChildren();

  // Which station and line, and when
  const grid = el("div", "suggestion-details");

  add(grid, detail("Station", row.stationName));

  if (row.lineName) {
    const lineValue = el("span", "admin-suggestion-line");
    const dot = el("span", "admin-suggestion-line-dot");
    if (row.lineColor) dot.style.setProperty("--c", row.lineColor);
    add(lineValue, dot, row.lineName);
    add(grid, detail("Line", lineValue));
  } else {
    add(grid, detail("Line", "Not specified"));
  }

  add(grid, detail("Submitted", row.submittedAt));

  if (row.reviewedAt && row.status !== "pending") {
    add(grid, 
      detail(
        row.status === "approved" ? "Resolved" : "Dismissed",
        row.reviewedAt,
      ),
    );
  }

  add(body, grid);

  // The suggestion itself
  const message = el("section", "suggestion-message-block");
  add(message, el("h3", undefined, "Suggestion"));
  add(message, 
    el(
      "p",
      "suggestion-message-text",
      row.message || "No message was written.",
    ),
  );
  add(body, message);

  const pending = row.status === "pending";
  resolveButton.hidden = !pending;
  dismissButton.hidden = !pending;
  reopenButton.hidden = pending;

  editLink.href = `/admin/stations/${row.stationId}/edit`;
}

function open(id: number) {
  const row = byId.get(id);
  if (!row) return;

  active = row;
  feedback.textContent = "";
  render(row);

  if (!modal.open) modal.showModal();
}

function setBusy(value: boolean) {
  busy = value;
  for (const button of [resolveButton, dismissButton, reopenButton, deleteButton]) {
    button.disabled = value;
  }
}

async function send(
  method: "PATCH" | "DELETE",
  payload?: { action: "resolve" | "dismiss" | "reopen" },
) {
  if (!active || busy) return;

  setBusy(true);
  feedback.textContent = "Saving…";

  try {
    const response = await fetch(
      `/api/admin/station-suggestions/${active.id}`,
      {
        method,
        headers: {
          Accept: "application/json",
          ...(payload ? { "Content-Type": "application/json" } : {}),
        },
        body: payload ? JSON.stringify(payload) : undefined,
      },
    );

    const result = (await response.json()) as {
      ok: boolean;
      message?: string;
    };

    if (!response.ok || !result.ok) {
      throw new Error(result.message || "The action failed.");
    }

    window.location.reload();
  } catch (error) {
    feedback.textContent =
      error instanceof Error ? error.message : "Unexpected error.";
    setBusy(false);
  }
}

document
  .querySelectorAll<HTMLButtonElement>("[data-suggestion-open]")
  .forEach((button) => {
    button.addEventListener("click", () =>
      open(Number(button.dataset.suggestionOpen)),
    );
  });

resolveButton.addEventListener("click", () =>
  void send("PATCH", { action: "resolve" }),
);
dismissButton.addEventListener("click", () =>
  void send("PATCH", { action: "dismiss" }),
);
reopenButton.addEventListener("click", () =>
  void send("PATCH", { action: "reopen" }),
);
deleteButton.addEventListener("click", () => {
  if (window.confirm("Permanently delete this suggestion? This cannot be undone.")) {
    void send("DELETE");
  }
});

document
  .querySelector("#suggestion-close")
  ?.addEventListener("click", () => modal.close());

modal.addEventListener("click", (event) => {
  if (event.target === modal) modal.close();
});

// Links from the dashboard open a suggestion directly: ?open=12
const wanted = Number(new URLSearchParams(location.search).get("open"));
if (Number.isInteger(wanted) && wanted > 0) open(wanted);

export {};
