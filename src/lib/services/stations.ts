import {
  createStation,
  deleteStation,
  getAdminStationsPaginated,
  updateStation,
  type StationEditItem,
} from "../db/stations";
import {
  getAvailableFacilitiesForStation,
  getFacilities,
  getStationFacilities,
  type Facility,
  type StationFacility,
} from "../db/facilities";
import {
  getAvailableTopPicksForStation,
  getStationTopPicks,
  getTopPicks,
  type StationTopPick,
  type TopPick,
} from "../db/top-picks";
import { hasErrors, paginationUrlFor, readListQuery, readText } from "./common";

import {
  type StationFormValues,
  type StationFormErrors,
  emptyStationErrors,
  toNumberOrNull,
  validateStationForm,
} from "../validators/station";

const LIST_PATH = "/admin/stations";
const PER_PAGE = 10;

interface StationFormBase {
  /** Set when the page should redirect (form saved). */
  redirectTo: string | null;
  values: StationFormValues;
  errors: StationFormErrors;
  formError: string;
}

export interface StationCreateResult extends StationFormBase {
  facilities: Facility[];
  topPicks: TopPick[];
}

export interface StationEditResult extends StationFormBase {
  stationFacilities: StationFacility[];
  availableFacilities: Facility[];
  stationTopPicks: StationTopPick[];
  availableTopPicks: TopPick[];
}

function readIds(formData: FormData, key: string): number[] {
  return [
    ...new Set(
      formData
        .getAll(key)
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0),
    ),
  ];
}

function readStationForm(formData: FormData) {
  const values: StationFormValues = {
    name: readText(formData, "name"),
    nameJapanese: readText(formData, "name_japanese"),
    slug: readText(formData, "slug").toLowerCase(),
    latitude: readText(formData, "latitude"),
    longitude: readText(formData, "longitude"),
    description: readText(formData, "description"),
    about: readText(formData, "about"),
    isVerified: formData.get("is_verified") === "on",
  };

  return {
    values,
    facilityIds: readIds(formData, "facility_ids"),
    topPickIds: readIds(formData, "top_pick_ids"),
  };
}

/** Field errors + "selected facility / top pick does not exist" errors. */
function validateStationSelections(
  values: StationFormValues,
  facilityIds: number[],
  topPickIds: number[],
  allFacilities: Facility[],
  allTopPicks: TopPick[],
): StationFormErrors {
  const errors = validateStationForm(values);

  const validFacilityIds = new Set(allFacilities.map((item) => item.id));
  const validTopPickIds = new Set(allTopPicks.map((item) => item.id));

  if (facilityIds.some((id) => !validFacilityIds.has(id))) {
    errors.facilities = "One or more selected facilities are invalid.";
  }

  if (topPickIds.some((id) => !validTopPickIds.has(id))) {
    errors.topPicks = "One or more selected top picks are invalid.";
  }

  return errors;
}

function toStationInput(
  values: StationFormValues,
  facilityIds: number[],
  topPickIds: number[],
) {
  return {
    name: values.name,
    nameJapanese: values.nameJapanese || null,
    slug: values.slug,
    latitude: toNumberOrNull(values.latitude),
    longitude: toNumberOrNull(values.longitude),
    description: values.description || null,
    about: values.about || null,
    facilityIds,
    topPickIds,
    isVerified: values.isVerified,
  };
}

/* ========================================
   Create
======================================== */

/** "New station" page: shows the form, saves it on POST. */
export async function handleStationCreate(
  request: Request,
  db: D1Database,
): Promise<StationCreateResult> {
  const facilities = await getFacilities(db);
  const topPicks = await getTopPicks(db);

  const result: StationCreateResult = {
    redirectTo: null,
    values: {
      name: "",
      nameJapanese: "",
      slug: "",
      latitude: "",
      longitude: "",
      description: "",
      about: "",
      isVerified: false,
    },
    errors: emptyStationErrors(),
    formError: "",
    facilities,
    topPicks,
  };

  if (request.method !== "POST") {
    return result;
  }

  const { values, facilityIds, topPickIds } = readStationForm(
    await request.formData(),
  );

  result.values = values;
  result.errors = validateStationSelections(
    values,
    facilityIds,
    topPickIds,
    facilities,
    topPicks,
  );

  if (hasErrors(result.errors)) {
    return result;
  }

  try {
    await createStation(db, toStationInput(values, facilityIds, topPickIds));

    result.redirectTo = LIST_PATH;
  } catch (err) {
    console.error(err);

    result.formError = "Unable to create station. The slug may already exist.";
  }

  return result;
}

/* ========================================
   Edit
======================================== */

/** "Edit station" page: starts from the stored station, saves on POST. */
export async function handleStationUpdate(
  request: Request,
  db: D1Database,
  id: number,
  station: StationEditItem,
): Promise<StationEditResult> {
  const result: StationEditResult = {
    redirectTo: null,
    values: {
      name: station.name,
      nameJapanese: station.name_japanese ?? "",
      slug: station.slug,
      latitude: station.latitude !== null ? String(station.latitude) : "",
      longitude: station.longitude !== null ? String(station.longitude) : "",
      description: station.description ?? "",
      about: station.about ?? "",
      isVerified: station.is_verified === 1,
    },
    errors: emptyStationErrors(),
    formError: "",
    stationFacilities: await getStationFacilities(db, id),
    availableFacilities: await getAvailableFacilitiesForStation(db, id),
    stationTopPicks: await getStationTopPicks(db, id),
    availableTopPicks: await getAvailableTopPicksForStation(db, id),
  };

  if (request.method !== "POST") {
    return result;
  }

  const formData = await request.formData();

  if (String(formData.get("action") ?? "") !== "update") {
    return result;
  }

  const { values, facilityIds, topPickIds } = readStationForm(formData);

  const allFacilities = await getFacilities(db);
  const allTopPicks = await getTopPicks(db);

  result.values = values;
  result.errors = validateStationSelections(
    values,
    facilityIds,
    topPickIds,
    allFacilities,
    allTopPicks,
  );

  if (!hasErrors(result.errors)) {
    try {
      await updateStation(
        db,
        id,
        toStationInput(values, facilityIds, topPickIds),
      );

      result.redirectTo = LIST_PATH;

      return result;
    } catch (err) {
      console.error(err);

      result.formError =
        "Unable to update station. The name or slug may already exist.";
    }
  }

  // The form is shown again: keep what the person selected.
  result.stationFacilities = facilityIds
    .map((facilityId) => allFacilities.find((item) => item.id === facilityId))
    .filter((item): item is Facility => Boolean(item))
    .map((item) => ({
      ...item,
      facility_count: null,
      floor: null,
      note: null,
    }));

  result.availableFacilities = allFacilities.filter(
    (item) => !facilityIds.includes(item.id),
  );

  result.stationTopPicks = topPickIds
    .map((topPickId, index): StationTopPick | null => {
      const topPick = allTopPicks.find((item) => item.id === topPickId);

      return topPick
        ? { ...topPick, sort_order: index + 1, walking_minutes: null }
        : null;
    })
    .filter((item): item is StationTopPick => Boolean(item));

  result.availableTopPicks = allTopPicks.filter(
    (item) => !topPickIds.includes(item.id),
  );

  return result;
}

/* ========================================
   Delete
======================================== */

/** Deletes a station on POST. Returns the URL to redirect to. */
export async function handleStationDelete(
  request: Request,
  db: D1Database,
  rawId: string | undefined,
): Promise<string> {
  const id = Number(rawId);

  if (!Number.isInteger(id) || id <= 0 || request.method !== "POST") {
    return LIST_PATH;
  }

  try {
    await deleteStation(db, id);
  } catch (err) {
    console.error("Failed to delete station:", err);
  }

  return LIST_PATH;
}

/* ========================================
   List
======================================== */

/** Stations list page: search, pagination and the pagination URL. */
export async function loadStationList(db: D1Database, url: URL) {
  const { search, page } = readListQuery(url);

  const { items, totalItems, currentPage, totalPages } =
    await getAdminStationsPaginated(db, {
      page,
      perPage: PER_PAGE,
      search,
    });

  return {
    stations: items,
    totalItems,
    currentPage,
    totalPages,
    perPage: PER_PAGE,
    searchParam: search,
    paginationUrl: paginationUrlFor(LIST_PATH, url, search),
  };
}
