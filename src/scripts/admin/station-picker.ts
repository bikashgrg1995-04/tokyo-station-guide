// Searchable single-station picker (see components/admin/StationPicker.astro).
// Keeps the chosen id in a hidden input so existing POST handlers are unchanged.

function initPicker(root: HTMLElement): void {
  if (root.dataset.spReady === "true") return;
  root.dataset.spReady = "true";

  const q = <T extends HTMLElement>(sel: string) =>
    root.querySelector<T>(sel) as T;

  const valueInput = q<HTMLInputElement>("[data-sp-value]");
  const chip = q<HTMLElement>("[data-sp-chip]");
  const chipName = q<HTMLElement>("[data-sp-chip-name]");
  const chipJp = q<HTMLElement>("[data-sp-chip-jp]");
  const clear = q<HTMLButtonElement>("[data-sp-clear]");
  const body = q<HTMLElement>("[data-sp-body]");
  const search = q<HTMLInputElement>("[data-sp-search]");
  const empty = q<HTMLElement>("[data-sp-empty]");
  const hint = q<HTMLElement>("[data-sp-hint]");
  const options = Array.from(
    root.querySelectorAll<HTMLButtonElement>(".sp-option"),
  );

  const filter = () => {
    const term = search.value.trim().toLowerCase();
    let visible = 0;

    for (const option of options) {
      const text = `${option.dataset.name} ${option.dataset.jp}`.toLowerCase();
      const show = !term || text.includes(term);
      option.hidden = !show;
      if (show) visible += 1;
    }

    empty.hidden = visible > 0;
  };

  const choose = (option: HTMLButtonElement | null) => {
    hint.textContent = "";

    if (!option) {
      valueInput.value = "";
      chip.hidden = true;
      body.hidden = false;
      search.value = "";
      filter();
      search.focus();
      return;
    }

    valueInput.value = option.dataset.id ?? "";
    chipName.textContent = option.dataset.name ?? "";
    chipJp.textContent = option.dataset.jp ?? "";
    chip.hidden = false;
    body.hidden = true;
  };

  for (const option of options) {
    option.addEventListener("click", () => choose(option));
  }

  clear.addEventListener("click", () => choose(null));
  search.addEventListener("input", filter);

  // Enter picks the first match instead of submitting the form.
  search.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    choose(options.find((option) => !option.hidden) ?? null);
  });

  root.closest("form")?.addEventListener("submit", (event) => {
    if (root.dataset.required === "true" && !valueInput.value) {
      event.preventDefault();
      hint.textContent = "Please select a station.";
      search.focus();
    }
  });

  // Pre-selected value (edit page / re-rendered form after an error)
  const initial = options.find((option) => option.dataset.id === valueInput.value);
  if (initial) choose(initial);
  else filter();
}

document
  .querySelectorAll<HTMLElement>("[data-station-picker]")
  .forEach(initPicker);

export {};
