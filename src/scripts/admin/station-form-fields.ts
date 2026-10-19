// The date is only editable while the station is marked as verified.
// Turning the switch on pre-fills today's date; it can then be changed.
document
  .querySelectorAll<HTMLElement>("[data-verification]")
  .forEach((box) => {
    const toggle = box.querySelector<HTMLInputElement>("#is_verified");
    const date = box.querySelector<HTMLInputElement>("#verified_at");

    if (!toggle || !date) return;

    const sync = () => {
      date.disabled = !toggle.checked;

      if (toggle.checked && !date.value) {
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        date.value = `${now.getFullYear()}-${month}-${day}`;
      }
    };

    toggle.addEventListener("change", sync);
  });

export {};
