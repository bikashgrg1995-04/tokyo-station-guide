/** Shared helpers for the admin services (form parsing, errors, list queries). */

/** Reads a text field from a form and trims it. */
export function readText(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/** True when at least one field has an error message. */
export function hasErrors(errors: Record<string, string>): boolean {
  return Object.values(errors).some((message) => message.length > 0);
}

/** Lower-cased message of an unknown error ("" when it is not an Error). */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message.toLowerCase() : "";
}

/** True when a (lower-cased) database error is a UNIQUE violation of `column`. */
export function isUniqueViolation(message: string, column: string): boolean {
  return (
    message.includes("unique constraint failed") && message.includes(column)
  );
}

export interface ListQuery {
  search: string;
  page: number;
}

/** Reads `?search=` and `?page=` of a list page. */
export function readListQuery(url: URL): ListQuery {
  const search = url.searchParams.get("search")?.trim() ?? "";
  const parsedPage = Number(url.searchParams.get("page"));

  const page =
    Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  return { search, page };
}

/** Base URL used by the Pagination component (keeps the search term). */
export function paginationUrlFor(
  path: string,
  url: URL,
  search: string,
): URL {
  const paginationUrl = new URL(path, url);

  if (search) {
    paginationUrl.searchParams.set("search", search);
  }

  return paginationUrl;
}
