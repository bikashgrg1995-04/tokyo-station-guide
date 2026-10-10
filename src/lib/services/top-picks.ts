
import {
  createTopPick,
  deleteTopPick,
  getTopPicksPaginated,
  hasTopPickAssignments,
  updateTopPick,
  type TopPick,
  type TopPickCategory,
} from "../db/top-picks";

import {
  errorMessage,
  hasErrors,
  isUniqueViolation,
  paginationUrlFor,
  readListQuery,
  readText,
} from "./common";

import {
  type TopPickFormValues,
  type TopPickFormErrors,
  emptyTopPickErrors,
  validateTopPickForm,
} from "../validators/top-pick";

const LIST_PATH = "/admin/top-picks";
const PER_PAGE = 10;

export interface TopPickFormResult {
  redirectTo: string | null;
  values: TopPickFormValues;
  errors: TopPickFormErrors;
  formError: string;
}

function readTopPickForm(formData: FormData): TopPickFormValues {
  return {
    name: readText(formData, "name"),
    nameJapanese: readText(formData, "name_japanese"),
    slug: readText(formData, "slug"),
    category: readText(formData, "category"),
    description: readText(formData, "description"),
    imageUrl: readText(formData, "image_url"),
  };
}

function describeSaveError(
  err: unknown,
  action: "create" | "update",
  errors: TopPickFormErrors,
): string {
  console.error(err);

  const message = errorMessage(err);

  if (isUniqueViolation(message, "top_picks.name")) {
    errors.name = "A top pick with this name already exists.";
    return "";
  }

  if (isUniqueViolation(message, "top_picks.slug")) {
    errors.slug = "A top pick with this slug already exists.";
    return "";
  }

  return `Unable to ${action} top pick because of an unexpected database error.`;
}

async function submitTopPickForm(
  request: Request,
  result: TopPickFormResult,
  action: "create" | "update",
  save: (values: TopPickFormValues) => Promise<void>,
): Promise<TopPickFormResult> {
  const values = readTopPickForm(await request.formData());

  result.values = values;
  result.errors = validateTopPickForm(values);

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

export async function handleTopPickCreate(
  request: Request,
  db: D1Database,
): Promise<TopPickFormResult> {
  const result: TopPickFormResult = {
    redirectTo: null,
    values: {
      name: "",
      nameJapanese: "",
      slug: "",
      category: "landmark",
      description: "",
      imageUrl: "",
    },
    errors: emptyTopPickErrors(),
    formError: "",
  };

  if (request.method !== "POST") {
    return result;
  }

  return submitTopPickForm(
    request,
    result,
    "create",
    async (values) => {
      await createTopPick(db, {
        name: values.name,
        nameJapanese: values.nameJapanese || null,
        slug: values.slug,
        category: values.category as TopPickCategory,
        description: values.description || null,
        imageUrl: values.imageUrl || null,
      });
    },
  );
}

export async function handleTopPickUpdate(
  request: Request,
  db: D1Database,
  id: number,
  topPick: TopPick | null,
): Promise<TopPickFormResult> {
  const result: TopPickFormResult = {
    redirectTo: null,
    values: {
      name: topPick?.name ?? "",
      nameJapanese: topPick?.name_japanese ?? "",
      slug: topPick?.slug ?? "",
      category: topPick?.category ?? "landmark",
      description: topPick?.description ?? "",
      imageUrl: topPick?.image_url ?? "",
    },
    errors: emptyTopPickErrors(),
    formError: "",
  };

  if (!topPick || request.method !== "POST") {
    return result;
  }

  return submitTopPickForm(
    request,
    result,
    "update",
    async (values) => {
      await updateTopPick(db, id, {
        name: values.name,
        nameJapanese: values.nameJapanese || null,
        slug: values.slug,
        category: values.category as TopPickCategory,
        description: values.description || null,
        imageUrl: values.imageUrl || null,
      });
    },
  );
}

export async function handleTopPickDelete(
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
    if (await hasTopPickAssignments(db, id)) {
      return `${LIST_PATH}?error=assigned`;
    }

    await deleteTopPick(db, id);
    return LIST_PATH;
  } catch (err) {
    console.error("Failed to delete top pick:", err);
    return `${LIST_PATH}?error=delete`;
  }
}

export async function loadTopPickList(
  db: D1Database,
  url: URL,
) {
  const { search, page } = readListQuery(url);

  const {
    items,
    totalItems,
    currentPage,
    totalPages,
  } = await getTopPicksPaginated(db, {
    page,
    perPage: PER_PAGE,
    search,
  });

  return {
    topPicks: items,
    totalItems,
    currentPage,
    totalPages,
    perPage: PER_PAGE,
    searchParam: search,
    paginationUrl: paginationUrlFor(LIST_PATH, url, search),
  };
}