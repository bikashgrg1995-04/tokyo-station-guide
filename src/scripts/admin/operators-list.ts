// Moved as-is from src/pages/admin/operators/index.astro

import { initializeAutoSearch } from "../auto-search";
    /* ========================================
       Delete Confirmation
    ======================================== */

    const deleteDialog =
      document.getElementById(
        "delete-operator-dialog",
      );

    const deleteForm =
      document.getElementById(
        "delete-operator-form",
      );

    let selectedOperatorId:
      string | null = null;

    const initializeDeleteButtons = () => {
      if (
        !(deleteDialog instanceof HTMLDivElement) ||
        !(deleteForm instanceof HTMLFormElement)
      ) {
        return;
      }

      const deleteButtons =
        document.querySelectorAll(
          ".js-delete-operator",
        );

      deleteButtons.forEach(
        (button) => {
          if (
            !(button instanceof HTMLButtonElement)
          ) {
            return;
          }

          /*
           * Prevent duplicate click handlers
           * when search replaces the table.
           */
          if (
            button.dataset
              .deleteInitialized === "true"
          ) {
            return;
          }

          button.dataset.deleteInitialized =
            "true";

          button.addEventListener(
            "click",
            () => {
              const operatorId =
                button.dataset.operatorId;

              const operatorName =
                button.dataset.operatorName;

              if (
                !operatorId ||
                !operatorName
              ) {
                return;
              }

              selectedOperatorId =
                operatorId;

              const nameElement =
                deleteDialog.querySelector(
                  ".common-dialog-name",
                );

              if (
                nameElement instanceof HTMLElement
              ) {
                nameElement.textContent =
                  operatorName;
              }

              deleteDialog.dispatchEvent(
                new CustomEvent(
                  "dialog:open",
                ),
              );
            },
          );
        },
      );
    };

    if (
      deleteDialog instanceof HTMLDivElement &&
      deleteForm instanceof HTMLFormElement
    ) {
      deleteDialog.addEventListener(
        "confirm",
        () => {
          if (!selectedOperatorId) {
            return;
          }

          deleteForm.action =
            `/admin/operators/${selectedOperatorId}/delete`;

          deleteForm.submit();

          selectedOperatorId = null;
        },
      );
    }

    /*
     * Initialize current page buttons.
     */
    initializeDeleteButtons();

    /* ========================================
       Auto Search
    ======================================== */

    initializeAutoSearch({
      inputId: "operator-search",
      formId: "operator-search-form",
      contentId: "operators-table-content",
      debounceMs: 350,
      onContentUpdated:
        initializeDeleteButtons,
    });
