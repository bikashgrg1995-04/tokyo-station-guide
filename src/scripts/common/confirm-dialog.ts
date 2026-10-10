// Moved as-is from src/components/ConfirmDialog.astro

const initializeConfirmDialogs = () => {
  const dialogs =
    document.querySelectorAll<HTMLElement>(
      "[data-common-confirm-dialog]",
    );

  dialogs.forEach((dialog) => {
    if (
      dialog.dataset.initialized === "true"
    ) {
      return;
    }

    dialog.dataset.initialized = "true";

    const cancelButton =
      dialog.querySelector<HTMLButtonElement>(
        "[data-dialog-cancel]",
      );

    const confirmButton =
      dialog.querySelector<HTMLButtonElement>(
        "[data-dialog-confirm]",
      );

    if (!cancelButton || !confirmButton) {
      return;
    }

    let previousFocusedElement:
      | HTMLElement
      | null = null;

    const close = () => {
      dialog.classList.remove("is-open");

      window.setTimeout(() => {
        dialog.hidden = true;
      }, 150);

      if (
        previousFocusedElement instanceof
        HTMLElement
      ) {
        previousFocusedElement.focus();
      }

      previousFocusedElement = null;
    };

    const confirm = () => {
      const formId =
        dialog.dataset.formId;

      if (formId) {
        const form =
          document.getElementById(formId);

        if (
          form instanceof HTMLFormElement
        ) {
          form.requestSubmit();
          return;
        }
      }

      dialog.dispatchEvent(
        new CustomEvent("confirm", {
          bubbles: true,
        }),
      );

      close();
    };

    const open = () => {
      previousFocusedElement =
        document.activeElement instanceof
        HTMLElement
          ? document.activeElement
          : null;

      dialog.hidden = false;

      requestAnimationFrame(() => {
        dialog.classList.add("is-open");
        cancelButton.focus();
      });
    };

    dialog.addEventListener(
      "dialog:open",
      open,
    );

    dialog.addEventListener(
      "dialog:close",
      close,
    );

    cancelButton.addEventListener(
      "click",
      close,
    );

    confirmButton.addEventListener(
      "click",
      confirm,
    );

    dialog.addEventListener(
      "click",
      (event) => {
        if (event.target === dialog) {
          close();
        }
      },
    );

    document.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key === "Escape" &&
          !dialog.hidden
        ) {
          close();
        }
      },
    );
  });
};

initializeConfirmDialogs();

export {};
