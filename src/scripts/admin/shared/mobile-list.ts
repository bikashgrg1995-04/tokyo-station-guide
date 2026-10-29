/**
 * Phones only: an admin table that does not fit the screen becomes a compact list.
 * Each row shows the important info (title + up to two details); swipe a row to the right (or tap ⋯)
 * to reveal its Edit / Delete buttons. Tables that fit are left as tables; desktop is never touched.
 */
const mq = window.matchMedia("(max-width: 640px)");
const HIDDEN_HEADS = /^(id|#|no\.?|slug|code|order|sort( order)?|image|photo|icon|created|updated)$/i;
const MAX_DETAILS = 2;
const REVEAL = 150; // px, width of the action layer

const isEmpty = (t: string) => t === "" || t === "—" || t === "-";

function classify(table: HTMLTableElement) {
  const heads = [...table.querySelectorAll<HTMLTableCellElement>("thead th")];
  const rows = [...table.querySelectorAll<HTMLTableRowElement>("tbody tr")].filter(
    (r) => r.cells.length === heads.length,
  );

  // Column roles come from the header and from what the cells contain.
  const role: ("hide" | "actions" | "info")[] = heads.map((th, i) => {
    const name = (th.textContent ?? "").trim();
    const first = rows[0]?.cells[i];
    if (th.querySelector('input[type="checkbox"]') || first?.querySelector('input[type="checkbox"]')) return "hide";
    if (/action/i.test(name) || first?.querySelector(".admin-table-actions, .sim-actions")) return "actions";
    if (HIDDEN_HEADS.test(name)) return "hide";
    return "info";
  });
  const infoCols = role.map((r, i) => (r === "info" ? i : -1)).filter((i) => i >= 0);

  for (const row of rows) {
    row.classList.add("m-row");
    let titleDone = false;
    let details = 0;
    [...row.cells].forEach((cell, i) => {
      cell.removeAttribute("data-m");
      if (role[i] === "actions") cell.dataset.m = "actions";
      else if (role[i] === "info" && infoCols.includes(i)) {
        const text = (cell.textContent ?? "").replace(/\s+/g, " ").trim();
        if (!titleDone) {
          cell.dataset.m = "title";
          titleDone = true;
        } else if (!isEmpty(text) && details < MAX_DETAILS) {
          cell.dataset.m = "detail";
          details++;
        }
      }
    });
    const shown = [...row.querySelectorAll<HTMLElement>('[data-m="title"], [data-m="detail"]')];
    shown.forEach((c) => c.classList.remove("m-last"));
    shown[shown.length - 1]?.classList.add("m-last");
    if (!row.querySelector(".m-more") && row.querySelector('[data-m="actions"]')) {
      const more = document.createElement("button");
      more.type = "button";
      more.className = "m-more";
      more.setAttribute("aria-label", "Show actions");
      more.textContent = "⋯";
      (row.querySelector('[data-m="title"]') ?? row.cells[0]).appendChild(more);
    }
  }
}

function declassify(table: HTMLTableElement) {
  table.classList.remove("m-list");
  table.querySelectorAll(".m-row").forEach((r) => {
    r.classList.remove("m-row", "is-open");
    (r as HTMLElement).style.removeProperty("--dx");
  });
  table.querySelectorAll("[data-m]").forEach((c) => {
    c.removeAttribute("data-m");
    c.classList.remove("m-last");
  });
  table.querySelectorAll(".m-more").forEach((b) => b.remove());
}

function refresh() {
  observer.disconnect(); // our own DOM changes must not trigger another refresh
  document.querySelectorAll<HTMLTableElement>("table.admin-table").forEach((table) => {
    declassify(table);
    if (!mq.matches || table.getClientRects().length === 0) return;
    const wrap = (table.closest(".admin-table-wrapper") ?? table.parentElement) as HTMLElement;
    if (wrap.scrollWidth <= wrap.clientWidth + 1) return; // it fits: keep the table
    classify(table);
    table.classList.add("m-list");
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function closeAll(except?: Element | null) {
  document.querySelectorAll<HTMLElement>(".m-row.is-open").forEach((r) => {
    if (r !== except) {
      r.classList.remove("is-open");
      r.style.removeProperty("--dx");
    }
  });
}

// Swipe right = open, swipe left = close. Vertical movement still scrolls the page.
let row: HTMLElement | null = null;
let x0 = 0;
let y0 = 0;
let base = 0;
let dragging = false;

document.addEventListener("pointerdown", (e) => {
  const r = (e.target as HTMLElement).closest<HTMLElement>(".m-list .m-row");
  if (!r || (e.target as HTMLElement).closest("a, button, input, select, textarea, label")) {
    if (!r) closeAll();
    row = null;
    return;
  }
  closeAll(r);
  row = r;
  x0 = e.clientX;
  y0 = e.clientY;
  base = r.classList.contains("is-open") ? REVEAL : 0;
  dragging = false;
});

document.addEventListener("pointermove", (e) => {
  if (!row) return;
  const dx = e.clientX - x0;
  const dy = e.clientY - y0;
  if (!dragging) {
    if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return;
    dragging = true;
    row.classList.add("is-dragging");
  }
  const v = Math.max(0, Math.min(REVEAL, base + dx));
  row.style.setProperty("--dx", `${v}px`);
});

function end() {
  if (!row) return;
  const r = row;
  row = null;
  r.classList.remove("is-dragging");
  if (!dragging) return;
  const v = parseFloat(r.style.getPropertyValue("--dx")) || 0;
  const open = v > REVEAL / 2;
  r.classList.toggle("is-open", open);
  if (open) r.style.setProperty("--dx", `${REVEAL}px`);
  else r.style.removeProperty("--dx");
}
document.addEventListener("pointerup", end);
document.addEventListener("pointercancel", end);

document.addEventListener("click", (e) => {
  const more = (e.target as HTMLElement).closest<HTMLElement>(".m-more");
  if (more) {
    const r = more.closest<HTMLElement>(".m-row")!;
    const open = !r.classList.contains("is-open");
    closeAll(r);
    r.classList.toggle("is-open", open);
    if (open) r.style.setProperty("--dx", `${REVEAL}px`);
    else r.style.removeProperty("--dx");
  } else if (!(e.target as HTMLElement).closest(".m-row")) {
    closeAll();
  }
});

const observer = new MutationObserver(() => later());
let timer: number | undefined;
const later = () => {
  window.clearTimeout(timer);
  timer = window.setTimeout(refresh, 120);
};
mq.addEventListener("change", refresh);
window.addEventListener("resize", later);
window.addEventListener("load", refresh);
refresh();
// Tables that are filtered, paged or re-rendered by other scripts.
observer.observe(document.body, { childList: true, subtree: true });
