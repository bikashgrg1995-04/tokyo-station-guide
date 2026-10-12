import {
  createFacility,
  deleteFacility,
  getFacilitiesPaginated,
  getFacilityById,
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
  checkIconFile,
  deleteIcon,
  isUploadedIcon,
  readIconFile,
  saveIcon,
  type IconCheck,
} from "../storage/facility-icons";

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

/*
 * Which value goes into facilities.icon:
 * - a newly uploaded file wins;
 * - typed text (or "remove") replaces the stored icon;
 * - otherwise the stored upload is kept.
 */
function chooseIcon(
  uploadedKey: string | null,
  values: FacilityFormValues,
  removeRequested: boolean,
  currentIcon: string | null,
): string | null {
  if (uploadedKey) {
    return uploadedKey;
  }

  if (removeRequested || values.icon) {
    return values.icon || null;
  }

  return isUploadedIcon(currentIcon) ? currentIcon : null;
}

/* The dark icon is always a file: a new upload, the kept one, or none. */
function chooseDarkIcon(
  uploadedKey: string | null,
  removeRequested: boolean,
  currentIcon: string | null,
): string | null {
  if (uploadedKey) {
    return uploadedKey;
  }

  if (removeRequested) {
    return null;
  }

  return isUploadedIcon(currentIcon) ? currentIcon : null;
}

/* Read and check one icon file field. Sets the field's error when it is not usable. */
async function checkIconField(
  formData: FormData,
  field: string,
  errorKey: "iconFile" | "iconDarkFile",
  bucket: R2Bucket | undefined,
  errors: FacilityFormErrors,
): Promise<IconCheck | null> {
  const file = readIconFile(formData, field);

  if (!file) {
    return null;
  }

  if (!bucket) {
    errors[errorKey] =
      "Icon storage (R2) is not configured. Bind the ASSETS_BUCKET R2 bucket.";
    return null;
  }

  const check = await checkIconFile(file);

  if (!check.ok) {
    errors[errorKey] = check.error;
    return null;
  }

  return check;
}

interface CurrentIcons {
  icon: string | null;
  iconDark: string | null;
}

async function submitFacilityForm(
  request: Request,
  result: FacilityFormResult,
  action: "create" | "update",
  bucket: R2Bucket | undefined,
  current: CurrentIcons,
  save: (
    values: FacilityFormValues,
    icon: string | null,
    iconDark: string | null,
  ) => Promise<void>,
): Promise<FacilityFormResult> {
  const formData = await request.formData();
  const values = readFacilityForm(formData);

  result.values = values;
  result.errors = validateFacilityForm(values);

  const light = await checkIconField(
    formData,
    "icon_file",
    "iconFile",
    bucket,
    result.errors,
  );

  const dark = await checkIconField(
    formData,
    "icon_dark_file",
    "iconDarkFile",
    bucket,
    result.errors,
  );

  if (hasErrors(result.errors)) {
    return result;
  }

  let lightKey: string | null = null;
  let darkKey: string | null = null;

  try {
    if (bucket && light?.ok) {
      lightKey = await saveIcon(bucket, values.slug, light);
    }

    if (bucket && dark?.ok) {
      darkKey = await saveIcon(bucket, `${values.slug}-dark`, dark);
    }

    const icon = chooseIcon(
      lightKey,
      values,
      formData.get("remove_icon") === "on",
      current.icon,
    );

    const iconDark = chooseDarkIcon(
      darkKey,
      formData.get("remove_icon_dark") === "on",
      current.iconDark,
    );

    await save(values, icon, iconDark);

    if (icon !== current.icon) {
      await deleteIcon(bucket, current.icon);
    }

    if (iconDark !== current.iconDark) {
      await deleteIcon(bucket, current.iconDark);
    }

    result.redirectTo = LIST_PATH;
  } catch (err) {
    await deleteIcon(bucket, lightKey);
    await deleteIcon(bucket, darkKey);
    result.formError = describeSaveError(err, action, result.errors);
  }

  return result;
}

export async function handleFacilityCreate(
  request: Request,
  db: D1Database,
  bucket?: R2Bucket,
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
    bucket,
    { icon: null, iconDark: null },
    async (values, icon, iconDark) => {
      await createFacility(db, {
        name: values.name,
        slug: values.slug,
        icon,
        iconDark,
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
  bucket?: R2Bucket,
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
    bucket,
    { icon: facility.icon, iconDark: facility.icon_dark },
    async (values, icon, iconDark) => {
      await updateFacility(db, id, {
        name: values.name,
        slug: values.slug,
        icon,
        iconDark,
        sortOrder: Number(values.sortOrder),
      });
    },
  );
}

export async function handleFacilityDelete(
  request: Request,
  db: D1Database,
  rawId: string | undefined,
  bucket?: R2Bucket,
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

    const facility = await getFacilityById(db, id);

    await deleteFacility(db, id);
    await deleteIcon(bucket, facility?.icon);
    await deleteIcon(bucket, facility?.icon_dark);

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