import {
  createFacility,
  deleteFacility,
  getFacilitiesPaginated,
  hasFacilityAssignments,
  updateFacility,
  type Facility,
} from "../db/facilities";

import {
  errorMessage,
  hasErrors,
  isUniqueViolation,
  paginationUrlFor,
  readListQuery,
  readText,
} from "./common";

import {
  type FacilityFormValues,
  type FacilityFormErrors,
  emptyFacilityErrors,
  validateFacilityForm,
} from "../validators/facility";

const LIST_PATH = "/admin/facilities";
const PER_PAGE = 10;

export interface FacilityFormResult {
  redirectTo: string | null;
  values: FacilityFormValues;
  errors: FacilityFormErrors;
  formError: string;
}

function readFacilityForm(formData: FormData): FacilityFormValues {
  return {
    name: readText(formData, "name"),
    slug: readText(formData, "slug"),
    icon: readText(formData, "icon"),
    sortOrder: readText(formData, "sort_order"),
  };
}

function describeSaveError(
  err: unknown,
  action: "create" | "update",
  errors: FacilityFormErrors,
): string {
  console.error(err);

  const message = errorMessage(err);

  if (isUniqueViolation(message, "facilities.name")) {
    errors.name = "A facility with this name already exists.";
    return "";
  }

  if (isUniqueViolation(message, "facilities.slug")) {
    errors.slug = "A facility with this slug already exists.";
    return "";
  }

  return `Unable to ${action} facility because of an unexpected database error.`;
}

async function submitFacilityForm(
  request: Request,
  result: FacilityFormResult,
  action: "create" | "update",
  save: (values: FacilityFormValues) => Promise<void>,
): Promise<FacilityFormResult> {
  const values = readFacilityForm(await request.formData());

  result.values = values;
  result.errors = validateFacilityForm(values);

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

export async function handleFacilityCreate(
  request: Request,
  db: D1Database,
): Promise<FacilityFormResult> {
  const result: FacilityFormResult = {
    redirectTo: null,
    values: {
      name: "",
      slug: "",
      icon: "",
      sortOrder: "0",
    },
    errors: emptyFacilityErrors(),
    formError: "",
  };

  if (request.method !== "POST") {
    return result;
  }

  return submitFacilityForm(
    request,
    result,
    "create",
    async (values) => {
      await createFacility(db, {
        name: values.name,
        slug: values.slug,
        icon: values.icon || null,
        sortOrder: Number(values.sortOrder),
      });
    },
  );
}

export async function handleFacilityUpdate(
  request: Request,
  db: D1Database,
  id: number,
  facility: Facility | null,
): Promise<FacilityFormResult> {
  const result: FacilityFormResult = {
    redirectTo: null,
    values: {
      name: facility?.name ?? "",
      slug: facility?.slug ?? "",
      icon: facility?.icon ?? "",
      sortOrder: String(facility?.sort_order ?? 0),
    },
    errors: emptyFacilityErrors(),
    formError: "",
  };

  if (!facility || request.method !== "POST") {
    return result;
  }

  return submitFacilityForm(
    request,
    result,
    "update",
    async (values) => {
      await updateFacility(db, id, {
        name: values.name,
        slug: values.slug,
        icon: values.icon || null,
        sortOrder: Number(values.sortOrder),
      });
    },
  );
}

export async function handleFacilityDelete(
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
    if (await hasFacilityAssignments(db, id)) {
      return `${LIST_PATH}?error=assigned`;
    }

    await deleteFacility(db, id);
    return LIST_PATH;
  } catch (err) {
    console.error("Failed to delete facility:", err);
    return `${LIST_PATH}?error=delete`;
  }
}

export async function loadFacilityList(
  db: D1Database,
  url: URL,
) {
  const { search, page } = readListQuery(url);

  const {
    items,
    totalItems,
    currentPage,
    totalPages,
  } = await getFacilitiesPaginated(db, {
    page,
    perPage: PER_PAGE,
    search,
  });

  return {
    facilities: items,
    totalItems,
    currentPage,
    totalPages,
    perPage: PER_PAGE,
    searchParam: search,
    paginationUrl: paginationUrlFor(LIST_PATH, url, search),
  };
}