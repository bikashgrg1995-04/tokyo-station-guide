// Moved as-is from src/pages/admin/lines/[id]/stations.astro

import { initializeAutoSearch } from "../common/auto-search";


/* ========================================
   Auto Search
======================================== */

initializeAutoSearch({
  inputId: "line-station-search",
  formId: "line-station-search-form",
  contentId: "line-stations-content",
  debounceMs: 350,
});


/* ========================================
   Add Station Modal
======================================== */

const addModal =
  document.getElementById(
    "add-station-modal",
  );

const openAddModal = () => {
  if (!(addModal instanceof HTMLElement)) {
    return;
  }

  addModal.hidden = false;

  addModal.setAttribute(
    "aria-hidden",
    "false",
  );

  document.body.classList.add(
    "admin-modal-open",
  );

  requestAnimationFrame(() => {
    addModal.classList.add("is-open");

    const stationSelect =
      document.getElementById(
        "add-station-id",
      );

    if (
      stationSelect instanceof HTMLSelectElement
    ) {
      stationSelect.focus();
    }
  });
};


const closeAddModal = () => {
  if (!(addModal instanceof HTMLElement)) {
    return;
  }

  addModal.classList.remove("is-open");

  addModal.setAttribute(
    "aria-hidden",
    "true",
  );

  document.body.classList.remove(
    "admin-modal-open",
  );

  window.setTimeout(() => {
    addModal.hidden = true;
  }, 150);
};


document.addEventListener(
  "click",
  (event) => {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    if (
      target.closest(
        "#open-add-station-button",
      ) ||
      target.closest(
        "#open-add-station-button-empty",
      )
    ) {
      openAddModal();
      return;
    }

    if (
      target.closest(
        "#close-add-station-modal",
      ) ||
      target.closest(
        "#cancel-add-station",
      ) ||
      target.closest(
        "[data-close-add-modal]",
      )
    ) {
      closeAddModal();
    }
  },
);


/* ========================================
   Edit Station Modal
======================================== */

const editModal =
  document.getElementById(
    "edit-station-modal",
  );

const editStationId =
  document.getElementById(
    "edit-station-id",
  );

const editStationName =
  document.getElementById(
    "edit-station-name",
  );

const editStationOrder =
  document.getElementById(
    "edit-station-order",
  );

const editStationCode =
  document.getElementById(
    "edit-station-code",
  );


const openEditModal = (
  button: HTMLElement,
) => {
  if (
    !(editModal instanceof HTMLElement) ||
    !(editStationId instanceof HTMLInputElement) ||
    !(editStationName instanceof HTMLElement) ||
    !(editStationOrder instanceof HTMLInputElement) ||
    !(editStationCode instanceof HTMLInputElement)
  ) {
    return;
  }

  editStationId.value =
    button.dataset.id ?? "";

  editStationName.textContent =
    button.dataset.stationName ??
    "Station";

  editStationOrder.value =
    button.dataset.stationOrder ??
    "";

  editStationCode.value =
    button.dataset.stationCode ??
    "";

  editModal.hidden = false;

  editModal.setAttribute(
    "aria-hidden",
    "false",
  );

  document.body.classList.add(
    "admin-modal-open",
  );

  requestAnimationFrame(() => {
    editModal.classList.add("is-open");

    editStationOrder.focus();
  });
};


const closeEditModal = () => {
  if (!(editModal instanceof HTMLElement)) {
    return;
  }

  editModal.classList.remove("is-open");

  editModal.setAttribute(
    "aria-hidden",
    "true",
  );

  document.body.classList.remove(
    "admin-modal-open",
  );

  window.setTimeout(() => {
    editModal.hidden = true;
  }, 150);
};


/*
 * Event delegation is intentional.
 * Auto-search replaces the table DOM,
 * so direct listeners would disappear.
 */

document.addEventListener(
  "click",
  (event) => {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const editButton =
      target.closest<HTMLElement>(
        "[data-edit-station]",
      );

    if (editButton) {
      openEditModal(editButton);
      return;
    }

    if (
      target.closest(
        "#close-edit-station-modal",
      ) ||
      target.closest(
        "#cancel-edit-station",
      ) ||
      target.closest(
        "[data-close-edit-modal]",
      )
    ) {
      closeEditModal();
    }
  },
);


/* ========================================
   Remove Confirmation
======================================== */

const removeDialog =
  document.getElementById(
    "remove-station-dialog",
  );

let pendingRemoveForm:
  | HTMLFormElement
  | null = null;


document.addEventListener(
  "submit",
  (event) => {
    const form =
      event.target;

    if (
      !(form instanceof HTMLFormElement)
    ) {
      return;
    }

    if (
      !form.matches(
        "form[data-station-remove]",
      )
    ) {
      return;
    }

    event.preventDefault();

    pendingRemoveForm = form;

    if (
      removeDialog instanceof HTMLDivElement
    ) {
      removeDialog.dispatchEvent(
        new CustomEvent(
          "dialog:open",
        ),
      );
    }
  },
);


if (
  removeDialog instanceof HTMLDivElement
) {
  removeDialog.addEventListener(
    "confirm",
    () => {
      if (!pendingRemoveForm) {
        return;
      }

      const form =
        pendingRemoveForm;

      pendingRemoveForm = null;

      form.submit();
    },
  );
}


/* ========================================
   Keyboard
======================================== */

document.addEventListener(
  "keydown",
  (event) => {
    if (event.key !== "Escape") {
      return;
    }

    if (
      addModal instanceof HTMLElement &&
      !addModal.hidden
    ) {
      closeAddModal();
      return;
    }

    if (
      editModal instanceof HTMLElement &&
      !editModal.hidden
    ) {
      closeEditModal();
    }
  },
);
