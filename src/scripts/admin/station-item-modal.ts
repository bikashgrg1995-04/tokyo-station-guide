const modal = document.getElementById("sim-modal") as HTMLElement | null;
const form = document.getElementById("sim-form") as HTMLFormElement | null;
const title = document.getElementById("sim-title");
const submit = document.getElementById("sim-submit");
const actionInput = form?.querySelector<HTMLInputElement>("input[name$='_action']");

function fill(values: Record<string, string>) {
  form?.reset();
  for (const [k, v] of Object.entries(values)) {
    const el = form?.elements.namedItem(k) as HTMLInputElement | null;
    if (el && "value" in el) el.value = v;
  }
}

function open(mode: "create" | "update", values: Record<string, string> = {}) {
  if (!modal || !form) return;
  const d = modal.dataset;
  if (actionInput) actionInput.value = mode === "create" ? d.createAction ?? "" : d.updateAction ?? "";
  if (title) title.textContent = (mode === "create" ? d.addTitle : d.editTitle) ?? "";
  if (submit) submit.textContent = mode === "create" ? d.addLabel ?? "Add" : "Save changes";
  fill(values);
  const prev = document.getElementById("sim-photo-preview") as HTMLElement | null;
  if (prev) {
    prev.hidden = !values.photo_url;
    const img = prev.querySelector("img");
    if (img) img.src = values.photo_url ?? "";
  }
  modal.hidden = false;
  form.querySelector<HTMLElement>("input[type='text'], input:not([type]), textarea")?.focus();
}

const close = () => { if (modal) modal.hidden = true; };

document.getElementById("sim-add")?.addEventListener("click", () => {
  const next = (document.getElementById("sim-add") as HTMLElement).dataset.nextOrder ?? "0";
  open("create", { sort_order: next });
});
document.querySelectorAll<HTMLElement>(".sim-edit").forEach((b) =>
  b.addEventListener("click", () => open("update", JSON.parse(b.dataset.item ?? "{}"))),
);
modal?.addEventListener("click", (e) => {
  if ((e.target as HTMLElement).closest("[data-close]")) close();
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });

const search = document.getElementById("sim-search") as HTMLInputElement | null;
search?.addEventListener("input", () => {
  const q = search.value.trim().toLowerCase();
  let shown = 0;
  document.querySelectorAll<HTMLElement>(".sim-row").forEach((r) => {
    const hide = q !== "" && !(r.dataset.search ?? "").includes(q);
    r.hidden = hide;
    if (!hide) shown++;
  });
  const e = document.getElementById("sim-empty-search");
  if (e) e.hidden = shown > 0;
});

// Reopen after a validation error, with what was typed.
const reopen = modal?.dataset.reopen;
if (reopen) {
  const r = JSON.parse(reopen) as { mode: "create" | "update"; values: Record<string, string> };
  open(r.mode, r.values);
}
