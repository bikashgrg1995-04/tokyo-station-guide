export interface AutoSearchOptions {
  inputId: string;
  formId: string;
  contentId: string;
  debounceMs?: number;
  onContentUpdated?: () => void;
}

export function initializeAutoSearch(options: AutoSearchOptions): void {
  const {
    inputId,
    formId,
    contentId,
    debounceMs = 350,
    onContentUpdated,
  } = options;

  const searchInput = document.getElementById(inputId);

  const searchForm = document.getElementById(formId);

  const content = document.getElementById(contentId);

  if (
    !(searchInput instanceof HTMLInputElement) ||
    !(searchForm instanceof HTMLFormElement) ||
    !(content instanceof HTMLElement)
  ) {
    return;
  }

  if (searchInput.dataset.autoSearchInitialized === "true") {
    return;
  }

  searchInput.dataset.autoSearchInitialized = "true";

  let searchTimer: number | undefined;

  let requestController: AbortController | null = null;

  let lastSearchValue = searchInput.value.trim();

  /* ========================================
     URL
  ======================================== */

  const createSearchUrl = (): URL => {
    const url = new URL(window.location.href);

    const searchValue = searchInput.value.trim();

    const searchParameter = searchInput.name || "search";

    if (searchValue) {
      url.searchParams.set(searchParameter, searchValue);
    } else {
      url.searchParams.delete(searchParameter);
    }

    /*
     * Every new search starts
     * from page 1.
     */
    url.searchParams.delete("page");

    return url;
  };

  const updateBrowserUrl = (url: URL, replace = true): void => {
    if (replace) {
      window.history.replaceState({}, "", url.toString());
    } else {
      window.history.pushState({}, "", url.toString());
    }
  };

  /* ========================================
     Focus
  ======================================== */

  const restoreSearchFocus = (): void => {
    searchInput.focus();

    const cursorPosition = searchInput.value.length;

    try {
      searchInput.setSelectionRange(cursorPosition, cursorPosition);
    } catch {
      // Ignore unsupported input selection.
    }
  };

  /* ========================================
     Loading State
  ======================================== */

  const setLoading = (loading: boolean): void => {
    content.setAttribute("aria-busy", loading ? "true" : "false");
  };

  /* ========================================
     Content
  ======================================== */

  const getNewContent = (html: string): HTMLElement | null => {
    const parser = new DOMParser();

    const parsedDocument = parser.parseFromString(html, "text/html");

    const newContent = parsedDocument.getElementById(contentId);

    if (!(newContent instanceof HTMLElement)) {
      return null;
    }

    return newContent;
  };

  const replaceContent = (newContent: HTMLElement): void => {
    content.replaceChildren(
      ...Array.from(newContent.childNodes).map((node) => node.cloneNode(true)),
    );
  };

  /* ========================================
     Pagination
  ======================================== */

  const initializePagination = (): void => {
    const paginationLinks = content.querySelectorAll("a[href]");

    paginationLinks.forEach((link) => {
      if (!(link instanceof HTMLAnchorElement)) {
        return;
      }

      if (link.dataset.autoSearchPaginationInitialized === "true") {
        return;
      }

      const url = new URL(link.href, window.location.origin);

      /*
       * Only intercept links that contain
       * a page parameter.
       *
       * Edit / delete / other links
       * continue behaving normally.
       */
      if (!url.searchParams.has("page")) {
        return;
      }

      if (url.pathname !== window.location.pathname) {
        return;
      }

      link.dataset.autoSearchPaginationInitialized = "true";

      link.addEventListener("click", (event) => {
        event.preventDefault();

        void loadContent(url, false);
      });
    });
  };

  /* ========================================
     Server Request
  ======================================== */

  const loadContent = async (
    url: URL,
    replaceHistory: boolean,
  ): Promise<void> => {
    /*
     * Cancel previous request.
     */
    requestController?.abort();

    const controller = new AbortController();

    requestController = controller;

    setLoading(true);

    try {
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "X-Requested-With": "XMLHttpRequest",
          Accept: "text/html",
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(
          `Auto search request failed with status ${response.status}.`,
        );
      }

      const html = await response.text();

      /*
       * Ignore stale requests.
       */
      if (controller.signal.aborted || requestController !== controller) {
        return;
      }

      const newContent = getNewContent(html);

      if (!newContent) {
        throw new Error(
          `Unable to find "${contentId}" in the server response.`,
        );
      }

      replaceContent(newContent);

      updateBrowserUrl(url, replaceHistory);

      /*
       * Pagination links were replaced,
       * so initialize them again.
       */
      initializePagination();

      /*
       * Page-specific dynamic behavior,
       * such as delete buttons.
       */
      onContentUpdated?.();

      /*
       * Keep search input focused.
       */
      restoreSearchFocus();

      lastSearchValue = searchInput.value.trim();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      console.error("Auto search failed:", error);
    } finally {
      if (requestController === controller) {
        requestController = null;
        setLoading(false);
      }
    }
  };

  /* ========================================
     Search
  ======================================== */

  const submitSearch = (): void => {
    const searchValue = searchInput.value.trim();

    /*
     * Do nothing when the value
     * hasn't actually changed.
     */
    if (searchValue === lastSearchValue) {
      restoreSearchFocus();
      return;
    }

    const url = createSearchUrl();

    void loadContent(url, true);
  };

  /* ========================================
     Input
  ======================================== */

  searchInput.addEventListener("input", () => {
    if (searchTimer !== undefined) {
      window.clearTimeout(searchTimer);
    }

    searchTimer = window.setTimeout(() => {
      submitSearch();
    }, debounceMs);
  });

  /* ========================================
     Form Submit
  ======================================== */

  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (searchTimer !== undefined) {
      window.clearTimeout(searchTimer);
    }

    submitSearch();
  });

  /* ========================================
     Browser Back / Forward
  ======================================== */

  window.addEventListener("popstate", () => {
    if (searchTimer !== undefined) {
      window.clearTimeout(searchTimer);
    }

    const url = new URL(window.location.href);

    const searchValue =
      url.searchParams.get(searchInput.name || "search") ?? "";

    searchInput.value = searchValue;

    lastSearchValue = searchValue;

    void loadContent(url, true);
  });

  /* ========================================
     Initial Pagination
  ======================================== */

  initializePagination();
}
