function setRowClosed(row: HTMLElement, closed: boolean) {
  row.classList.toggle("is-closed", closed);

  row
    .querySelectorAll<HTMLInputElement>("input[data-field]")
    .forEach((input) => {
      input.disabled = closed;
    });
}

document
  .querySelectorAll<HTMLElement>("[data-hours-table]")
  .forEach((table) => {
    table.addEventListener("change", (event) => {
      const target = event.target as HTMLInputElement;

      if (!target.matches("[data-hours-closed]")) {
        return;
      }

      const row = target.closest<HTMLElement>("[data-hours-row]");

      if (row) {
        setRowClosed(row, target.checked);
      }
    });

    table
      .querySelector<HTMLButtonElement>("[data-hours-apply]")
      ?.addEventListener("click", () => {
        const bulk = {
          opening:
            table.querySelector<HTMLInputElement>('[data-bulk="opening"]')
              ?.value ?? "",
          closing:
            table.querySelector<HTMLInputElement>('[data-bulk="closing"]')
              ?.value ?? "",
          last_entry:
            table.querySelector<HTMLInputElement>('[data-bulk="last_entry"]')
              ?.value ?? "",
        };

        table
          .querySelectorAll<HTMLElement>("[data-hours-row]")
          .forEach((row) => {
            if (row.classList.contains("is-closed")) {
              return;
            }

            (Object.keys(bulk) as (keyof typeof bulk)[]).forEach((field) => {
              const input = row.querySelector<HTMLInputElement>(
                `input[data-field="${field}"]`,
              );

              if (input) {
                input.value = bulk[field];
              }
            });
          });
      });
  });

export {};
