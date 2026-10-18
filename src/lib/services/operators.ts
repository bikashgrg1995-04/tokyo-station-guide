import {
  createOperator,
  deleteOperator,
  getOperatorsPaginated,
  updateOperator,
  type Operator,
} from "../db/operators";
import {
  errorMessage,
  hasErrors,
  isUniqueViolation,
  paginationUrlFor,
  readListQuery,
  readText,
} from "./common";

import {
  type OperatorFormValues,
  type OperatorFormErrors,
  emptyOperatorErrors,
  validateOperatorForm,
} from "../validators/operator";

const LIST_PATH = "/admin/operators";
const PER_PAGE = 10;


export interface OperatorFormResult {
  /** Set when the page should redirect (form saved). */
  redirectTo: string | null;
  values: OperatorFormValues;
  errors: OperatorFormErrors;
  formError: string;
}


function readOperatorForm(formData: FormData): OperatorFormValues {
  return {
    name: readText(formData, "name"),
    slug: readText(formData, "slug"),
    description: readText(formData, "description"),
    websiteUrl: readText(formData, "website_url"),
    nameJapanese: readText(formData, "name_japanese"),
    descriptionJapanese: readText(formData, "description_japanese"),
  };
}


/** Turns a database error into field errors; returns the general form error. */
function describeSaveError(
  err: unknown,
  action: "create" | "update",
  errors: OperatorFormErrors,
): string {
  console.error(err);

  const message = errorMessage(err);

  if (isUniqueViolation(message, "operators.name")) {
    errors.name = "An operator with this name already exists.";
    return "";
  }

  if (isUniqueViolation(message, "operators.slug")) {
    errors.slug = "An operator with this slug already exists.";
    return "";
  }

  return `Unable to ${action} operator because of an unexpected database error.`;
}

async function submitOperatorForm(
  request: Request,
  result: OperatorFormResult,
  action: "create" | "update",
  save: (values: OperatorFormValues) => Promise<void>,
): Promise<OperatorFormResult> {
  const values = readOperatorForm(await request.formData());

  result.values = values;
  result.errors = validateOperatorForm(values);

  if (hasErrors(result.errors)) {
    return result;
  }

  try {
    await save(values);

    result.redirectTo = LIST_PATH;
  } catch (err) {
    result.formError = describeSaveError(err, action, result.errors);
  }

  return result;
}

/** "New operator" page: shows the form, saves it on POST. */
export async function handleOperatorCreate(
  request: Request,
  db: D1Database,
): Promise<OperatorFormResult> {
  const result: OperatorFormResult = {
    redirectTo: null,
    values: {
      name: "",
      slug: "",
      description: "",
      websiteUrl: "",
      nameJapanese: "",
      descriptionJapanese: "",
    },
    errors: emptyOperatorErrors(),
    formError: "",
  };

  if (request.method !== "POST") {
    return result;
  }

  return submitOperatorForm(request, result, "create", async (values) => {
    await createOperator(db, {
      name: values.name,
      slug: values.slug,
      description: values.description || null,
      websiteUrl: values.websiteUrl || null,
      nameJapanese: values.nameJapanese || null,
      descriptionJapanese: values.descriptionJapanese || null,
    });
  });
}

/** "Edit operator" page: starts from the stored operator, saves on POST. */
export async function handleOperatorUpdate(
  request: Request,
  db: D1Database,
  id: number,
  operator: Operator | null,
): Promise<OperatorFormResult> {
  const result: OperatorFormResult = {
    redirectTo: null,
    values: {
      name: operator?.name ?? "",
      slug: operator?.slug ?? "",
      description: operator?.description ?? "",
      websiteUrl: operator?.website_url ?? "",
      nameJapanese: operator?.name_japanese ?? "",
      descriptionJapanese: operator?.description_japanese ?? "",
    },
    errors: emptyOperatorErrors(),
    formError: "",
  };

  if (!operator || request.method !== "POST") {
    return result;
  }

  return submitOperatorForm(request, result, "update", async (values) => {
    await updateOperator(db, id, {
      name: values.name,
      slug: values.slug,
      description: values.description || null,
      websiteUrl: values.websiteUrl || null,
      nameJapanese: values.nameJapanese || null,
      descriptionJapanese: values.descriptionJapanese || null,
    });
  });
}

/* ========================================
   Delete
======================================== */

/** Deletes an operator on POST. Returns the URL to redirect to. */
export async function handleOperatorDelete(
  request: Request,
  db: D1Database,
  rawId: string | undefined,
): Promise<string> {
  const id = Number(rawId);

  if (!Number.isInteger(id) || id <= 0) {
    return LIST_PATH;
  }

  if (request.method !== "POST") {
    return LIST_PATH;
  }

  try {
    await deleteOperator(db, id);

    return LIST_PATH;
  } catch (err) {
    console.error("Failed to delete operator:", err);

    return `${LIST_PATH}?error=delete`;
  }
}

/* ========================================
   List
======================================== */

/** Operators list page: search, pagination and the pagination URL. */
export async function loadOperatorList(db: D1Database, url: URL) {
  const { search, page } = readListQuery(url);

  const { items, totalItems, currentPage, totalPages } =
    await getOperatorsPaginated(db, {
      page,
      perPage: PER_PAGE,
      search,
    });

  return {
    operators: items,
    totalItems,
    currentPage,
    totalPages,
    perPage: PER_PAGE,
    searchParam: search,
    paginationUrl: paginationUrlFor(LIST_PATH, url, search),
  };
}
