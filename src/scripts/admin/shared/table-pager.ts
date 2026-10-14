/**
 * Client-side search + pagination for a table body.
 *
 * Rows stay in the DOM (so form inputs inside them are still submitted);
 * rows outside the current page or search result only get `hidden`.
 * Rows added or removed by other scripts are picked up automatically.
 */

export interface TablePagerOptions {
  /** The <tbody> that holds the data rows. */
  body: HTMLElement;
  /** Selects the data rows inside `body` (not the empty-state row). */
  rowSelector: string;
  /** Rows per page when there is no page size <select>. */
  pageSize?: number;
  pageSizeSelect?: HTMLSelectElement | null;
  search?: HTMLInputElement | null;
  /** "Showing 1–5 of 12" */
  info?: HTMLElement | null;
  /** Receives the Previous / 1 2 3 / Next buttons. */
  nav?: HTMLElement | null;
  /** "12 facility entries" or "3 of 12 facility entries". */
  count?: HTMLElement | null;
  /** Shown when the search matches nothing. */
  noResults?: HTMLElement | null;
  /** Hidden while the table has no rows at all. */
  footer?: HTMLElement | null;
  /** Plural noun used in the labels. */
  noun?: string;
}

export interface TablePager {
  refresh(): void;
}

/** Text a row is searched by: every cell except the last (actions). */
function rowSearchText(row: HTMLElement): string {
  if (row.dataset.search) {
    return row.dataset.search;
  }

  const cells = Array.from(
    row.querySelectorAll<HTMLElement>(":scope > td"),
  ).slice(0, -1);

  return cells
    .map((cell) => {
      const copy = cell.cloneNode(true) as HTMLElement;
      copy.querySelectorAll("button").forEach((button) => button.remove());

      const values = Array.from(
        cell.querySelectorAll<HTMLInputElement>(
          "input:not([type='hidden']):not([type='color'])",
        ),
      ).map((input) => input.value);

      return `${copy.textContent ?? ""} ${values.join(" ")}`;
    })
    .join(" ")
    .toLowerCase();
}

/** Page numbers to show: 1 … 4 5 6 … 12 (null = gap). */
function pageWindow(page: number, pageCount: number): Array<number | null> {
  const wanted = new Set([1, pageCount, page - 1, page, page + 1]);
  const pages = [...wanted]
    .filter((value) => value >= 1 && value <= pageCount)
    .sort((a, b) => a - b);

  const result: Array<number | null> = [];

  pages.forEach((value, index) => {
    if (index > 0 && value - pages[index - 1] > 1) {
      result.push(null);
    }

    result.push(value);
  });

  return result;
}

export function createTablePager(options: TablePagerOptions): TablePager {
  const {
    body,
    rowSelector,
    pageSize = 5,
    pageSizeSelect = null,
    search = null,
    info = null,
    nav = null,
    count = null,
    noResults = null,
    footer = null,
    noun = "items",
  } = options;

  let page = 1;
  let lastTotal = body.querySelectorAll(rowSelector).length;
  let scheduled = false;

  const readRows = (): HTMLElement[] =>
    Array.from(body.querySelectorAll<HTMLElement>(rowSelector));

  const makeButton = (
    label: string,
    ariaLabel: string,
    target: number,
    disabled: boolean,
    active = false,
  ): HTMLButtonElement => {
    const button = document.createElement("button");

    // type="button": these live inside the station form and must not submit it.
    button.type = "button";
    button.className = "admin-pagination-button";
    button.textContent = label;
    button.setAttribute("aria-label", ariaLabel);
    button.disabled = disabled;

    if (active) {
      button.classList.add("active");
      button.setAttribute("aria-current", "page");
    }

    button.addEventListener("click", () => {
      page = target;
      render();
    });

    return button;
  };

  const renderNav = (pageCount: number): void => {
    if (!nav) return;

    nav.replaceChildren();
    nav.hidden = pageCount <= 1;

    if (pageCount <= 1) return;

    nav.appendChild(makeButton("‹", "Previous page", page - 1, page <= 1));

    pageWindow(page, pageCount).forEach((value) => {
      if (value === null) {
        const gap = document.createElement("span");
        gap.textContent = "…";
        gap.setAttribute("aria-hidden", "true");
        nav.appendChild(gap);
        return;
      }

      nav.appendChild(
        makeButton(String(value), `Page ${value}`, value, false, value === page),
      );
    });

    nav.appendChild(makeButton("›", "Next page", page + 1, page >= pageCount));
  };

  function render(): void {
    scheduled = false;

    const rows = readRows();
    const query = (search?.value ?? "").trim().toLowerCase();

    const matches = query
      ? rows.filter((row) => rowSearchText(row).includes(query))
      : rows;

    const size = Math.max(
      1,
      pageSizeSelect ? Number(pageSizeSelect.value) || pageSize : pageSize,
    );

    const pageCount = Math.max(1, Math.ceil(matches.length / size));

    // New rows are appended, so jump to the page that shows them.
    if (!query && rows.length > lastTotal) {
      page = pageCount;
    }

    lastTotal = rows.length;
    page = Math.min(Math.max(page, 1), pageCount);

    const start = (page - 1) * size;
    const end = Math.min(start + size, matches.length);
    const visible = new Set(matches.slice(start, end));

    rows.forEach((row) => {
      row.hidden = !visible.has(row);
    });

    if (info) {
      info.textContent = matches.length
        ? `Showing ${start + 1}–${end} of ${matches.length}`
        : `No matching ${noun}`;
    }

    if (count) {
      count.textContent = query
        ? `${matches.length} of ${rows.length} ${noun}`
        : `${rows.length} ${noun}`;
    }

    if (noResults) {
      noResults.hidden = !(rows.length > 0 && matches.length === 0);
    }

    if (footer) {
      footer.hidden = rows.length === 0;
    }

    renderNav(pageCount);
  }

  const scheduleRender = (): void => {
    if (scheduled) return;

    scheduled = true;
    queueMicrotask(render);
  };

  search?.addEventListener("input", () => {
    page = 1;
    render();
  });

  // Enter in the search box must never submit the surrounding form.
  search?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
    }
  });

  pageSizeSelect?.addEventListener("change", () => {
    page = 1;
    render();
  });

  // Rows added / removed by the add and remove dialogs.
  new MutationObserver(scheduleRender).observe(body, { childList: true });

  render();

  return { refresh: render };
}

/**
 * Wires every `[data-paged-table]` container (see PagedTable.astro).
 */
export function initializePagedTables(): void {
  document
    .querySelectorAll<HTMLElement>("[data-paged-table]")
    .forEach((container) => {
      if (container.dataset.pagedReady === "true") return;

      const body = container.querySelector<HTMLElement>("tbody");
      const rowSelector = container.dataset.rowSelector;

      if (!body || !rowSelector) return;

      container.dataset.pagedReady = "true";

      createTablePager({
        body,
        rowSelector,
        pageSize: Number(container.dataset.pageSize) || 5,
        noun: container.dataset.noun || "items",
        search: container.querySelector<HTMLInputElement>(
          "[data-paged-toolbar] input",
        ),
        count: container.querySelector<HTMLElement>("[data-paged-count]"),
        info: container.querySelector<HTMLElement>("[data-paged-info]"),
        nav: container.querySelector<HTMLElement>("[data-paged-nav]"),
        noResults: container.querySelector<HTMLElement>("[data-paged-empty]"),
        footer: container.querySelector<HTMLElement>("[data-paged-footer]"),
      });
    });
}
