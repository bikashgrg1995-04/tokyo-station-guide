// Phone admin menu: the three-line button opens/closes the sidebar;
// tapping outside the menu, a menu link, or pressing Escape closes it.

const shell = document.querySelector<HTMLElement>(".admin-shell");
const toggle = document.querySelector<HTMLButtonElement>("[data-admin-menu-toggle]");
const backdrop = document.querySelector<HTMLElement>("[data-admin-menu-close]");
const sidebar = document.getElementById("admin-sidebar");

if (shell && toggle && backdrop && sidebar) {
  const setOpen = (open: boolean) => {
    shell.classList.toggle("is-menu-open", open);
    backdrop.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.body.style.overflow = open ? "hidden" : "";
  };

  toggle.addEventListener("click", () =>
    setOpen(!shell.classList.contains("is-menu-open")),
  );

  backdrop.addEventListener("click", () => setOpen(false));

  sidebar.addEventListener("click", (event) => {
    if ((event.target as HTMLElement).closest("a")) setOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });

  // Rotating / widening past the phone layout: make sure nothing stays locked.
  window.matchMedia("(min-width: 761px)").addEventListener("change", (query) => {
    if (query.matches) setOpen(false);
  });
}

export {};
