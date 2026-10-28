/** Table + popup editor. Every [data-sim-root] on the page works on its own. */
function init(root: HTMLElement) {
  const q = <T extends Element = HTMLElement>(name: string) => root.querySelector(`[data-sim="${name}"]`) as T | null;
  const modal = q("modal");
  const form = q<HTMLFormElement>("form");
  const title = q("title");
  const submit = q("submit");
  const actionInput = form?.querySelector<HTMLInputElement>("input[name$='_action']") ?? null;
  const search = q<HTMLInputElement>("search");
  const addBtn = q("add");

  function fill(values: Record<string, string>) {
    form?.reset();
    for (const [k, v] of Object.entries(values)) {
      const multi = form?.querySelectorAll<HTMLInputElement>(`input[type='checkbox'][name="${k}"][value]`);
      if (multi && multi.length) {
        const set = new Set(v.split(",").filter(Boolean));
        multi.forEach((c) => (c.checked = set.has(c.value)));
        continue;
      }
      const el = form?.elements.namedItem(k) as HTMLInputElement | null;
      if (!el || !("value" in el) || el.type === "file") continue;
      if (el.type === "checkbox") el.checked = v === "on" || v === "1";
      else el.value = v;
    }
  }

  function open(mode: "create" | "update", values: Record<string, string> = {}) {
    if (!modal || !form) return;
    const d = modal.dataset;
    if (actionInput) actionInput.value = (mode === "create" ? d.createAction : d.updateAction) ?? "";
    if (title) title.textContent = (mode === "create" ? d.addTitle : d.editTitle) ?? "";
    if (submit) submit.textContent = mode === "create" ? d.addLabel ?? "Add" : "Save changes";
    fill(values);
    const prev = q("photo-preview");
    if (prev) {
      prev.hidden = !values.photo_url;
      const img = prev.querySelector("img");
      if (img) img.src = values.photo_url ?? "";
    }
    // Fields that only make sense when adding / editing, and read-only text taken from the row.
    modal.querySelectorAll<HTMLElement>("[data-sim-create-only]").forEach((el) => (el.hidden = mode !== "create"));
    modal.querySelectorAll<HTMLElement>("[data-sim-edit-only]").forEach((el) => (el.hidden = mode !== "update"));
    modal.querySelectorAll<HTMLElement>("[data-sim-text]").forEach((el) => (el.textContent = values[el.dataset.simText ?? ""] ?? ""));
    modal.querySelectorAll<HTMLAnchorElement>("[data-sim-href]").forEach((el) => {
      el.href = (el.dataset.simHref ?? "").replace("{id}", values.item_id ?? "");
    });
    filters().forEach(applyFilter);
    syncWhen();
    modal.hidden = false;
    form.querySelector<HTMLElement>("input[type='text'], input:not([type]), textarea")?.focus();
  }

  const filters = () => Array.from(form?.querySelectorAll("[data-sim-filter]") ?? []) as unknown as HTMLSelectElement[];
  // A select that narrows another select's options by data-category.
  function applyFilter(filter: HTMLSelectElement) {
    const target = form?.elements.namedItem(filter.dataset.simFilter ?? "") as HTMLSelectElement | null;
    if (!target) return;
    Array.from(target.options).forEach((o) => {
      const show = !o.dataset.category || !filter.value || o.dataset.category === filter.value;
      o.hidden = !show;
      o.disabled = !show;
    });
    if (target.selectedOptions[0]?.disabled) target.value = "";
  }
  filters().forEach((f) => f.addEventListener("change", () => applyFilter(f)));

  // Blocks that only show while their checkbox is ticked: data-sim-when="<checkbox name>".
  function syncWhen() {
    form?.querySelectorAll<HTMLElement>("[data-sim-when]").forEach((b) => {
      const c = form.elements.namedItem(b.dataset.simWhen ?? "") as HTMLInputElement | null;
      b.hidden = !(c && c.checked);
    });
  }
  form?.addEventListener("change", syncWhen);

  const close = () => {
    if (modal) modal.hidden = true;
  };

  addBtn?.addEventListener("click", () => open("create", { sort_order: addBtn.dataset.nextOrder ?? "0" }));
  root.querySelectorAll<HTMLElement>(".sim-edit").forEach((b) =>
    b.addEventListener("click", () => open("update", JSON.parse(b.dataset.item ?? "{}"))),
  );
  modal?.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest("[data-close]")) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal && !modal.hidden) close();
  });

  // Add button sits beside the search box, in one toolbar.
  let toolbar = root.querySelector<HTMLElement>(".sim-toolbar");
  if (!toolbar && (addBtn || search)) {
    toolbar = document.createElement("div");
    toolbar.className = "sim-toolbar";
    root.querySelector(".admin-panel")?.insertAdjacentElement("beforebegin", toolbar);
  }
  if (toolbar && addBtn) toolbar.appendChild(addBtn);

  // Search + pagination (10 rows a page).
  const PAGE = 10;
  const rows = Array.from(root.querySelectorAll<HTMLElement>(".sim-row"));
  let page = 1;
  let pill = "";
  root.querySelectorAll<HTMLElement>("[data-sim-pill]").forEach((b) =>
    b.addEventListener("click", () => {
      pill = b.dataset.simPill ?? "";
      root.querySelectorAll("[data-sim-pill]").forEach((x) => x.classList.toggle("is-active", x === b));
      page = 1;
      render();
    }),
  );
  let pager: HTMLElement | null = null;
  if (rows.length > PAGE) {
    pager = document.createElement("div");
    pager.className = "sim-pager";
    root.querySelector(".admin-table-wrapper")?.insertAdjacentElement("afterend", pager);
  }
  function render() {
    const text = (search?.value ?? "").trim().toLowerCase();
    const match = rows.filter(
      (r) =>
        (text === "" || (r.dataset.search ?? "").includes(text)) &&
        (pill === "" || (r.dataset.flags ?? "").split(" ").includes(pill)),
    );
    const pages = Math.max(1, Math.ceil(match.length / PAGE));
    page = Math.min(page, pages);
    const from = (page - 1) * PAGE;
    const visible = new Set(match.slice(from, from + PAGE));
    rows.forEach((r) => (r.hidden = !visible.has(r)));
    const e = q("empty");
    if (e) e.hidden = match.length > 0;
    if (pager) {
      pager.hidden = match.length <= PAGE;
      pager.innerHTML = "";
      const info = document.createElement("span");
      info.textContent = `${from + 1}-${Math.min(from + PAGE, match.length)} of ${match.length}`;
      const mk = (label: string, to: number, off: boolean) => {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = label;
        b.disabled = off;
        b.addEventListener("click", () => {
          page = to;
          render();
        });
        return b;
      };
      pager.appendChild(info);
      pager.appendChild(mk("‹ Prev", page - 1, page <= 1));
      pager.appendChild(mk("Next ›", page + 1, page >= pages));
    }
  }
  search?.addEventListener("input", () => {
    page = 1;
    render();
  });
  render();

  const reopen = modal?.dataset.reopen;
  if (reopen) {
    const r = JSON.parse(reopen) as { mode: "create" | "update"; values: Record<string, string> };
    open(r.mode, r.values);
    root.scrollIntoView();
  }
}

document.querySelectorAll<HTMLElement>("[data-sim-root]").forEach(init);
