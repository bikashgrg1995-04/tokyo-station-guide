const byId = <T = HTMLElement>(id: string) => document.getElementById(id) as T | null;

const modal = byId("station-modal");
const form = byId<HTMLFormElement>("station-assignment-form");
const select = byId<HTMLSelectElement>("modal-station");
const searchInput = byId<HTMLInputElement>("station-picker-search");
const list = byId("station-picker-list");
const chip = byId("station-chip");
const chipName = byId("station-chip-name");
const chipJp = byId("station-chip-jp");
const pickerBody = byId("station-picker-body");
const emptyMsg = byId("station-picker-empty");
const countEl = byId("station-picker-count");
const title = byId("station-modal-title");
const submit = byId("station-modal-submit");
const loc = byId<HTMLInputElement>("modal-location");
const locJa = byId<HTMLInputElement>("modal-location-ja");
const order = byId<HTMLInputElement>("modal-order");

let editing = false;

const options = () => Array.from(list?.querySelectorAll<HTMLButtonElement>(".station-picker-option") ?? []);

function filter() {
  const q = (searchInput?.value ?? "").trim().toLowerCase();
  let shown = 0;
  for (const o of options()) {
    const hay = `${o.dataset.stationName} ${o.dataset.stationJapanese}`.toLowerCase();
    const hide = o.dataset.assigned === "true" || (q !== "" && !hay.includes(q));
    o.hidden = hide;
    if (!hide) shown++;
  }
  if (emptyMsg) emptyMsg.hidden = shown > 0;
  if (countEl) countEl.textContent = `${shown} available`;
}

function choose(id: string, name: string, jp: string) {
  if (select) select.value = id;
  if (chipName) chipName.textContent = name;
  if (chipJp) chipJp.textContent = jp;
  if (chip) chip.hidden = false;
  if (pickerBody) pickerBody.hidden = true;
}

function clearChoice() {
  if (select) select.value = "";
  if (chip) chip.hidden = true;
  if (pickerBody) pickerBody.hidden = false;
  filter();
  searchInput?.focus();
}

function open(edit?: HTMLElement) {
  if (!modal) return;
  form?.reset();
  editing = !!edit;
  if (searchInput) searchInput.value = "";
  if (edit) {
    choose(edit.dataset.stationId ?? "", edit.dataset.stationName ?? "", edit.dataset.stationJapanese ?? "");
    if (loc) loc.value = edit.dataset.location ?? "";
    if (locJa) locJa.value = edit.dataset.locationJapanese ?? "";
    if (order) order.value = edit.dataset.sortOrder ?? "0";
    const clear = byId("station-chip-clear");
    if (clear) clear.hidden = true;
  } else {
    const clear = byId("station-chip-clear");
    if (clear) clear.hidden = false;
    clearChoice();
  }
  if (title) title.textContent = edit ? "Edit Station" : "Add Station";
  if (submit) submit.textContent = edit ? "Save Changes" : "Add Station";
  modal.hidden = false;
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function close() {
  if (!modal) return;
  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

byId("open-add-modal")?.addEventListener("click", () => open());
byId("station-chip-clear")?.addEventListener("click", clearChoice);
searchInput?.addEventListener("input", filter);
list?.addEventListener("click", (e) => {
  const o = (e.target as HTMLElement).closest<HTMLButtonElement>(".station-picker-option");
  if (o) choose(o.dataset.stationId ?? "", o.dataset.stationName ?? "", o.dataset.stationJapanese ?? "");
});
modal?.addEventListener("click", (e) => {
  if ((e.target as HTMLElement).closest("[data-close-modal]")) close();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal && !modal.hidden) close();
});
document.querySelectorAll<HTMLElement>(".js-edit-assignment").forEach((b) =>
  b.addEventListener("click", () => open(b)),
);
form?.addEventListener("submit", (e) => {
  if (!select?.value) {
    e.preventDefault();
    searchInput?.focus();
  }
});

// Table search
const tableSearch = byId<HTMLInputElement>("station-search");
tableSearch?.addEventListener("input", () => {
  const q = tableSearch.value.trim().toLowerCase();
  let shown = 0;
  document.querySelectorAll<HTMLElement>(".station-table-row").forEach((r) => {
    const hide = q !== "" && !(r.dataset.search ?? "").includes(q);
    r.hidden = hide;
    if (!hide) shown++;
  });
  const empty = byId("station-search-empty");
  if (empty) empty.hidden = shown > 0;
});

filter();
