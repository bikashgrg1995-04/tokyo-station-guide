import {
  createFeaturedStation,
  deleteFeaturedStation,
  getFeaturedStationById,
  updateFeaturedStation,
  type FeaturedStation,
} from "../db/featured-stations";
import { hasErrors, readText } from "./common";
import {
  checkFeaturedImage,
  deleteFeaturedImage,
  readFeaturedImageFile,
  saveFeaturedImage,
} from "../storage/featured-station-images";

import {
  type FeaturedStationFormValues,
  type FeaturedStationFormErrors,
  emptyFeaturedStationErrors,
  validateFeaturedStationForm,
} from "../validators/featured-station";

const LIST_PATH = "/admin/featured-stations";


export interface FeaturedStationFormResult {
  /** Set when the page should redirect (form saved). */
  redirectTo: string | null;
  values: FeaturedStationFormValues;
  errors: FeaturedStationFormErrors;
  formError: string;
}


function readFeaturedStationForm(formData: FormData): FeaturedStationFormValues {
  return {
    stationId: readText(formData, "station_id"),
    imageUrl: "",
    description: readText(formData, "description"),
    sortOrder: formData.has("sort_order") ? readText(formData, "sort_order") : "0",
    isActive: formData.get("is_active") === "on",
  };
}


async function submitFeaturedStationForm(
  request: Request,
  result: FeaturedStationFormResult,
  action: "create" | "update",
  bucket: R2Bucket | undefined,
  currentImage: string | null,
  save: (values: FeaturedStationFormValues, imageUrl: string) => Promise<void>,
): Promise<FeaturedStationFormResult> {
  const formData = await request.formData();
  const values = readFeaturedStationForm(formData);

  // The stored photo is never typed in; it only changes by uploading a file.
  values.imageUrl = currentImage ?? "";

  result.values = values;
  result.errors = validateFeaturedStationForm(values);

  const file = readFeaturedImageFile(formData);
  let check: Awaited<ReturnType<typeof checkFeaturedImage>> | null = null;

  if (!file && !currentImage) {
    result.errors.imageUrl = "Please upload a photo.";
  } else if (file) {
    if (!bucket) {
      result.errors.imageUrl =
        "Image storage (R2) is not configured. Bind the ASSETS_BUCKET R2 bucket.";
    } else {
      check = await checkFeaturedImage(file);

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
      uploadedKey = await saveFeaturedImage(
        bucket,
        `station-${values.stationId}`,
        check,
      );
    }

    const imageUrl = uploadedKey ?? currentImage ?? "";

    await save(values, imageUrl);

    if (uploadedKey && currentImage) {
      await deleteFeaturedImage(bucket, currentImage);
    }

    result.redirectTo = LIST_PATH;
  } catch (err) {
    console.error(err);

    await deleteFeaturedImage(bucket, uploadedKey);

    result.formError = `Unable to ${action} featured station. The station may already be featured.`;
  }

  return result;
}

function toInput(values: FeaturedStationFormValues, imageUrl: string) {
  return {
    stationId: Number(values.stationId),
    imageUrl,
    description: values.description,
    sortOrder: Number(values.sortOrder),
    isActive: values.isActive,
  };
}

/** "New featured station" page: shows the form, saves it on POST. */
export async function handleFeaturedStationCreate(
  request: Request,
  db: D1Database,
  bucket?: R2Bucket,
): Promise<FeaturedStationFormResult> {
  const result: FeaturedStationFormResult = {
    redirectTo: null,
    values: {
      stationId: "",
      imageUrl: "",
      description: "",
      sortOrder: "0",
      isActive: true,
    },
    errors: emptyFeaturedStationErrors(),
    formError: "",
  };

  if (request.method !== "POST") {
    return result;
  }

  return submitFeaturedStationForm(
    request,
    result,
    "create",
    bucket,
    null,
    async (values, imageUrl) => {
      await createFeaturedStation(db, toInput(values, imageUrl));
    },
  );
}

/** "Edit featured station" page: starts from the stored row, saves on POST. */
export async function handleFeaturedStationUpdate(
  request: Request,
  db: D1Database,
  id: number,
  featuredStation: FeaturedStation,
  bucket?: R2Bucket,
): Promise<FeaturedStationFormResult> {
  const result: FeaturedStationFormResult = {
    redirectTo: null,
    values: {
      stationId: String(featuredStation.station_id),
      imageUrl: featuredStation.image_url,
      description: featuredStation.description,
      sortOrder: String(featuredStation.sort_order),
      isActive: featuredStation.is_active === 1,
    },
    errors: emptyFeaturedStationErrors(),
    formError: "",
  };

  if (request.method !== "POST") {
    return result;
  }

  return submitFeaturedStationForm(
    request,
    result,
    "update",
    bucket,
    featuredStation.image_url,
    async (values, imageUrl) => {
      await updateFeaturedStation(db, id, toInput(values, imageUrl));
    },
  );
}

/* ========================================
   Delete
======================================== */

/** Deletes a featured station on POST. Returns the URL to redirect to. */
export async function handleFeaturedStationDelete(
  request: Request,
  db: D1Database,
  rawId: string | undefined,
  bucket?: R2Bucket,
): Promise<string> {
  const id = Number(rawId);

  if (!Number.isInteger(id) || id <= 0 || request.method !== "POST") {
    return LIST_PATH;
  }

  try {
    const existing = await getFeaturedStationById(db, id);

    await deleteFeaturedStation(db, id);
    await deleteFeaturedImage(bucket, existing?.image_url);
  } catch (err) {
    console.error("Failed to delete featured station:", err);
  }

  return LIST_PATH;
}
