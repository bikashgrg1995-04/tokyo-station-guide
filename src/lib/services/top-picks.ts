
import {
  createTopPick,
  deleteTopPick,
  getTopPickById,
  getTopPicksPaginated,
  hasTopPickAssignments,
  updateTopPick,
  type TopPick,
  type TopPickCategory,
  type TopPickOpeningHour,
} from "../db/top-picks";

import {
  checkTopPickImage,
  deleteTopPickImage,
  readTopPickImageFile,
  saveTopPickImage,
} from "../storage/top-pick-images";

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
  const openingHours: TopPickOpeningHour[] = [];

  for (let day = 0; day <= 6; day++) {
    const isClosed = formData.get(`closed_${day}`) === "on";

    openingHours.push({
      day_of_week: day,
      is_closed: isClosed,
      opening_time: isClosed
        ? null
        : readText(formData, `opening_time_${day}`) || null,
      closing_time: isClosed
        ? null
        : readText(formData, `closing_time_${day}`) || null,
      last_entry_time:
        readText(formData, `last_entry_time_${day}`) || null,
    });
  }

  return {
    name: readText(formData, "name"),
    nameJapanese: readText(formData, "name_japanese"),
    slug: readText(formData, "slug"),
    category: readText(formData, "category"),
    description: readText(formData, "description"),
    descriptionJapanese: readText(formData, "description_japanese"),
    imageUrl: "",
    entryFee: readText(formData, "entry_fee"),
    entryFeeJapanese: readText(formData, "entry_fee_japanese"),
    mapUrl: readText(formData, "map_url"),
    notes: readText(formData, "notes"),
    notesJapanese: readText(formData, "notes_japanese"),
    openingHours,
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
  bucket: R2Bucket | undefined,
  currentImage: string | null,
  save: (values: TopPickFormValues, imageUrl: string | null) => Promise<void>,
): Promise<TopPickFormResult> {
  const formData = await request.formData();
  const values = readTopPickForm(formData);

  // The stored image is never typed in; it only changes by upload or removal.
  values.imageUrl = currentImage ?? "";

  result.values = values;
  result.errors = validateTopPickForm(values);

  const file = readTopPickImageFile(formData);
  let check: Awaited<ReturnType<typeof checkTopPickImage>> | null = null;

  if (file) {
    if (!bucket) {
      result.errors.imageUrl =
        "Image storage (R2) is not configured. Bind the ASSETS_BUCKET R2 bucket.";
    } else {
      check = await checkTopPickImage(file);

      if (!check.ok) {
        result.errors.imageUrl = check.error;
      }
    }
  }

  if (hasErrors(result.errors)) {
    return result;
  }

  let uploadedKey: string | null = null;

  try {
    if (bucket && check?.ok) {
      uploadedKey = await saveTopPickImage(bucket, values.slug, check);
    }

    const imageUrl =
      uploadedKey ??
      (formData.get("remove_image") === "on" ? null : currentImage);

    await save(values, imageUrl);

    if (imageUrl !== currentImage) {
      await deleteTopPickImage(bucket, currentImage);
    }

    result.redirectTo = LIST_PATH;
  } catch (err) {
    await deleteTopPickImage(bucket, uploadedKey);
    result.formError = describeSaveError(err, action, result.errors);
  }

  return result;
}

export async function handleTopPickCreate(
  request: Request,
  db: D1Database,
  bucket?: R2Bucket,
): Promise<TopPickFormResult> {
  const result: TopPickFormResult = {
    redirectTo: null,
    values: {
      name: "",
      nameJapanese: "",
      slug: "",
      category: "landmark",
      description: "",
      descriptionJapanese: "",
      imageUrl: "",
      entryFee: "",
      entryFeeJapanese: "",
      mapUrl: "",
      notes: "",
      notesJapanese: "",
      openingHours: Array.from({ length: 7 }, (_, day) => ({
        day_of_week: day,
        is_closed: false,
        opening_time: "",
        closing_time: "",
        last_entry_time: "",
      })),
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
    bucket,
    null,
    async (values, imageUrl) => {
      await createTopPick(db, {
        name: values.name,
        nameJapanese: values.nameJapanese || null,
        slug: values.slug,
        category: values.category as TopPickCategory,
        description: values.description || null,
        descriptionJapanese: values.descriptionJapanese || null,
        imageUrl,
        entryFee: values.entryFee || null,
        entryFeeJapanese: values.entryFeeJapanese || null,
        mapUrl: values.mapUrl || null,
        notes: values.notes || null,
        notesJapanese: values.notesJapanese || null,
        openingHours: values.openingHours,
      });
    },
  );
}

export async function handleTopPickUpdate(
  request: Request,
  db: D1Database,
  id: number,
  topPick: TopPick | null,
  bucket?: R2Bucket,
): Promise<TopPickFormResult> {
  const result: TopPickFormResult = {
    redirectTo: null,
    values: {
      name: topPick?.name ?? "",
      nameJapanese: topPick?.name_japanese ?? "",
      slug: topPick?.slug ?? "",
      category: topPick?.category ?? "landmark",
      description: topPick?.description ?? "",
      descriptionJapanese: topPick?.description_japanese ?? "",
      imageUrl: topPick?.image_url ?? "",
      entryFee: topPick?.entry_fee ?? "",
      entryFeeJapanese: topPick?.entry_fee_japanese ?? "",
      mapUrl: topPick?.map_url ?? "",
      notes: topPick?.notes ?? "",
      notesJapanese: topPick?.notes_japanese ?? "",
      openingHours: Array.from({ length: 7 }, (_, day) => {
        const existing = topPick?.opening_hours?.find(
          (hour) => hour.day_of_week === day,
        );

        return (
          existing ?? {
            day_of_week: day,
            is_closed: false,
            opening_time: "",
            closing_time: "",
            last_entry_time: "",
          }
        );
      }),
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
    bucket,
    topPick.image_url,
    async (values, imageUrl) => {
      await updateTopPick(db, id, {
        name: values.name,
        nameJapanese: values.nameJapanese || null,
        slug: values.slug,
        category: values.category as TopPickCategory,
        description: values.description || null,
        descriptionJapanese: values.descriptionJapanese || null,
        imageUrl,
        entryFee: values.entryFee || null,
        entryFeeJapanese: values.entryFeeJapanese || null,
        mapUrl: values.mapUrl || null,
        notes: values.notes || null,
        notesJapanese: values.notesJapanese || null,
        openingHours: values.openingHours,
      });
    },
  );
}

export async function handleTopPickDelete(
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
    if (await hasTopPickAssignments(db, id)) {
      return `${LIST_PATH}?error=assigned`;
    }

    const existing = await getTopPickById(db, id);

    await deleteTopPick(db, id);
    await deleteTopPickImage(bucket, existing?.image_url);
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
