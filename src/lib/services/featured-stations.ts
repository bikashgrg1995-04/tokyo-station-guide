import {
  createFeaturedStation,
  deleteFeaturedStation,
  updateFeaturedStation,
  type FeaturedStation,
} from "../db/featured-stations";
import { hasErrors, readText } from "./common";

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
    imageUrl: readText(formData, "image_url"),
    description: readText(formData, "description"),
    sortOrder: formData.has("sort_order") ? readText(formData, "sort_order") : "0",
    isActive: formData.get("is_active") === "on",
  };
}


async function submitFeaturedStationForm(
  request: Request,
  result: FeaturedStationFormResult,
  action: "create" | "update",
  save: (values: FeaturedStationFormValues) => Promise<void>,
): Promise<FeaturedStationFormResult> {
  const values = readFeaturedStationForm(await request.formData());

  result.values = values;
  result.errors = validateFeaturedStationForm(values);

  if (hasErrors(result.errors)) {
    return result;
  }

  try {
    await save(values);

    result.redirectTo = LIST_PATH;
  } catch (err) {
    console.error(err);

    result.formError = `Unable to ${action} featured station. The station may already be featured.`;
  }

  return result;
}

function toInput(values: FeaturedStationFormValues) {
  return {
    stationId: Number(values.stationId),
    imageUrl: values.imageUrl,
    description: values.description,
    sortOrder: Number(values.sortOrder),
    isActive: values.isActive,
  };
}

/** "New featured station" page: shows the form, saves it on POST. */
export async function handleFeaturedStationCreate(
  request: Request,
  db: D1Database,
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

  return submitFeaturedStationForm(request, result, "create", async (values) => {
    await createFeaturedStation(db, toInput(values));
  });
}

/** "Edit featured station" page: starts from the stored row, saves on POST. */
export async function handleFeaturedStationUpdate(
  request: Request,
  db: D1Database,
  id: number,
  featuredStation: FeaturedStation,
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

  return submitFeaturedStationForm(request, result, "update", async (values) => {
    await updateFeaturedStation(db, id, toInput(values));
  });
}

/* ========================================
   Delete
======================================== */

/** Deletes a featured station on POST. Returns the URL to redirect to. */
export async function handleFeaturedStationDelete(
  request: Request,
  db: D1Database,
  rawId: string | undefined,
): Promise<string> {
  const id = Number(rawId);

  if (!Number.isInteger(id) || id <= 0 || request.method !== "POST") {
    return LIST_PATH;
  }

  try {
    await deleteFeaturedStation(db, id);
  } catch (err) {
    console.error("Failed to delete featured station:", err);
  }

  return LIST_PATH;
}
