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
import {
  hasErrors,
  paginationUrlFor,
  readListQuery,
  readText,
} from "./common";

const LIST_PATH = "/admin/stations";
const PER_PAGE = 10;

export interface StationFormValues {
  name: string;
  nameJapanese: string;
  slug: string;
  /** Latitude as typed in the form. */
  latitude: string;
  /** Longitude as typed in the form. */
  longitude: string;
  description: string;
  about: string;
}

export type StationFormErrors = Record<
  keyof StationFormValues | "facilities" | "topPicks",
  string
>;

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

/* ========================================
   Form
======================================== */

function emptyErrors(): StationFormErrors {
  return {
    name: "",
    nameJapanese: "",
    slug: "",
    latitude: "",
    longitude: "",
    description: "",
    about: "",
    facilities: "",
    topPicks: "",
  };
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
  };

  return {
    values,
    facilityIds: readIds(formData, "facility_ids"),
    topPickIds: readIds(formData, "top_pick_ids"),
  };
}

function toNumberOrNull(value: string): number | null {
  return value === "" ? null : Number(value);
}

export function validateStationForm(
  values: StationFormValues,
): StationFormErrors {
  const { name, nameJapanese, slug, description, about } = values;
  const latitude = toNumberOrNull(values.latitude);
  const longitude = toNumberOrNull(values.longitude);
  const errors = emptyErrors();

  if (!name) {
    errors.name = "Station name is required.";
  } else if (name.length > 150) {
    errors.name = "Station name must be 150 characters or less.";
  }

  if (nameJapanese.length > 150) {
    errors.nameJapanese = "Japanese name must be 150 characters or less.";
  }

  if (!slug) {
    errors.slug = "Slug is required.";
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    errors.slug =
      "Slug can only contain lowercase letters, numbers, and hyphens.";
  } else if (slug.length > 150) {
    errors.slug = "Slug must be 150 characters or less.";
  }

  if (latitude !== null && !Number.isFinite(latitude)) {
    errors.latitude = "Latitude must be a valid number.";
  } else if (latitude !== null && (latitude < -90 || latitude > 90)) {
    errors.latitude = "Latitude must be between -90 and 90.";
  }

  if (longitude !== null && !Number.isFinite(longitude)) {
    errors.longitude = "Longitude must be a valid number.";
  } else if (longitude !== null && (longitude < -180 || longitude > 180)) {
    errors.longitude = "Longitude must be between -180 and 180.";
  }

  if (description.length > 1000) {
    errors.description = "Description must be 1000 characters or less.";
  }

  if (about.length > 1000) {
    errors.about = "About must be 1000 characters or less.";
  }

  return errors;
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
    },
    errors: emptyErrors(),
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
    },
    errors: emptyErrors(),
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
    .map((item) => ({ ...item, note: null }));

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
