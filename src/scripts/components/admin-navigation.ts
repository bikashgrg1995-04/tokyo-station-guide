// Moved as-is from src/components/AdminNavigation.astro

const logoutForm = document.getElementById("admin-logout-form");

const logoutDialog = document.getElementById("admin-logout-dialog");

if (
  logoutForm instanceof HTMLFormElement &&
  logoutDialog instanceof HTMLDivElement
) {
  let confirmed = false;

  logoutForm.addEventListener("submit", (event) => {
    if (confirmed) {
      return;
    }

    event.preventDefault();

    logoutDialog.dispatchEvent(new CustomEvent("dialog:open"));
  });

  logoutDialog.addEventListener("confirm", () => {
    confirmed = true;

    logoutForm.submit();
  });
}

export {};
