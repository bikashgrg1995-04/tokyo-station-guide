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

import { getStationFloors } from "../db/station-floors";
import type { StationFacilityInput } from "../db/stations/types";

import {
  hasErrors,
  paginationUrlFor,
  readListQuery,
  readText,
} from "./common";

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

interface ParsedStationFacilities {
  entries: StationFacilityInput[];
  error: string | null;
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

/**
 * Reads repeated floor-wise facility fields in matching order.
 *
 * Expected field names:
 * - facility_entry_facility_id
 * - facility_entry_floor_id
 * - facility_entry_count
 * - facility_entry_note
 */
function readStationFacilities(
  formData: FormData,
): ParsedStationFacilities {
  const facilityIds = formData.getAll("facility_entry_facility_id");
  const floorIds = formData.getAll("facility_entry_floor_id");
  const counts = formData.getAll("facility_entry_count");
  const notes = formData.getAll("facility_entry_note");

  const entries: StationFacilityInput[] = [];
  const errors: string[] = [];

  const rowCount = Math.max(
    facilityIds.length,
    floorIds.length,
    counts.length,
    notes.length,
  );

  for (let index = 0; index < rowCount; index += 1) {
    const rawFacilityId = String(facilityIds[index] ?? "").trim();
    const rawFloorId = String(floorIds[index] ?? "").trim();
    const rawCount = String(counts[index] ?? "").trim();
    const note = String(notes[index] ?? "").trim();

    // Ignore rows that are entirely empty.
    if (!rawFacilityId && !rawFloorId && !rawCount && !note) {
      continue;
    }

    const facilityId = Number(rawFacilityId);
    const floorId = Number(rawFloorId);
    const facilityCount = Number(rawCount);

    if (!Number.isInteger(facilityId) || facilityId <= 0) {
      errors.push(`Row ${index + 1}: select a valid facility.`);
      continue;
    }

    if (!Number.isInteger(floorId) || floorId <= 0) {
      errors.push(`Row ${index + 1}: select a valid floor.`);
      continue;
    }

    if (
      !rawCount ||
      !Number.isInteger(facilityCount) ||
      facilityCount < 1
    ) {
      errors.push(
        `Row ${index + 1}: quantity must be a whole number of at least 1.`,
      );
      continue;
    }

    entries.push({
      facilityId,
      floorId,
      facilityCount,
      note: note || null,
    });
  }

  // The same facility can be assigned to different floors,
  // but not more than once to the same floor.
  const seen = new Set<string>();

  for (const entry of entries) {
    const key = `${entry.facilityId}:${entry.floorId}`;

    if (seen.has(key)) {
      errors.push(
        `Facility ID ${entry.facilityId} is assigned to the same floor more than once.`,
      );
    }

    seen.add(key);
  }

  return {
    entries,
    error: errors.length > 0 ? errors[0] : null,
  };
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

  const parsedFacilities = readStationFacilities(formData);

  return {
    values,
    // Retained for compatibility with older form fields.
    facilityIds: readIds(formData, "facility_ids"),
    stationFacilities: parsedFacilities.entries,
    stationFacilitiesError: parsedFacilities.error,
    topPickIds: readIds(formData, "top_pick_ids"),
  };
}

function validateStationSelections(
  values: StationFormValues,
  facilityIds: number[],
  stationFacilities: StationFacilityInput[],
  topPickIds: number[],
  allFacilities: Facility[],
  allTopPicks: TopPick[],
): StationFormErrors {
  const errors = validateStationForm(values);

  const validFacilityIds = new Set(allFacilities.map((item) => item.id));
  const validTopPickIds = new Set(allTopPicks.map((item) => item.id));

  const selectedFacilityIds = [
    ...facilityIds,
    ...stationFacilities.map((entry) => entry.facilityId),
  ];

  if (selectedFacilityIds.some((id) => !validFacilityIds.has(id))) {
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
  stationFacilities: StationFacilityInput[],
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
    stationFacilities,
    topPickIds,
    isVerified: values.isVerified,
  };
}

/* ========================================
   Create
======================================== */

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

  const {
    values,
    facilityIds,
    stationFacilities,
    stationFacilitiesError,
    topPickIds,
  } = readStationForm(await request.formData());

  result.values = values;

  result.errors = validateStationSelections(
    values,
    facilityIds,
    stationFacilities,
    topPickIds,
    facilities,
    topPicks,
  );

  if (stationFacilitiesError) {
    result.errors.facilities = stationFacilitiesError;
  }

  // New station creation must not assign facilities before floors exist.
  if (stationFacilities.length > 0 || facilityIds.length > 0) {
    result.errors.facilities =
      "Create the station first, then add floors and assign facilities from Edit Station.";
  }

  if (hasErrors(result.errors)) {
    return result;
  }

  try {
    await createStation(
      db,
      toStationInput(values, [], topPickIds, []),
    );

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

  const {
    values,
    facilityIds,
    stationFacilities,
    stationFacilitiesError,
    topPickIds,
  } = readStationForm(formData);

  const allFacilities = await getFacilities(db);
  const allTopPicks = await getTopPicks(db);
  const stationFloors = await getStationFloors(db, id);
  const validFloorIds = new Set(stationFloors.map((floor) => floor.id));

  result.values = values;

  result.errors = validateStationSelections(
    values,
    facilityIds,
    stationFacilities,
    topPickIds,
    allFacilities,
    allTopPicks,
  );

  if (stationFacilitiesError) {
    result.errors.facilities = stationFacilitiesError;
  }

  if (stationFacilities.some((entry) => !validFloorIds.has(entry.floorId))) {
    result.errors.facilities =
      "One or more selected floors do not belong to this station.";
  }

  if (!hasErrors(result.errors)) {
    try {
      await updateStation(
        db,
        id,
        toStationInput(
          values,
          facilityIds,
          topPickIds,
          stationFacilities,
        ),
      );

      result.redirectTo = LIST_PATH;
      return result;
    } catch (err) {
      console.error(err);
      result.formError =
        "Unable to update station. The name or slug may already exist.";
    }
  }

  // Preserve submitted facility rows when validation fails.
  result.stationFacilities = stationFacilities.map((entry) => {
    const facility = allFacilities.find(
      (item) => item.id === entry.facilityId,
    );
    const floor = stationFloors.find(
      (item) => item.id === entry.floorId,
    );

    return {
      id: 0,
      facility_id: entry.facilityId,
      floor_id: entry.floorId,
      floor_name: floor?.name ?? "Unknown floor",
      floor_name_japanese: floor?.name_japanese ?? null,
      name: facility?.name ?? "Unknown facility",
      slug: facility?.slug ?? "",
      icon: facility?.icon ?? null,
      icon_dark: facility?.icon_dark ?? null,
      sort_order: facility?.sort_order ?? 0,
      facility_count: entry.facilityCount,
      note: entry.note ?? null,
    };
  });

  // A facility remains available because it can be assigned on
  // another floor. The modal will filter assignments per selected floor.
  result.availableFacilities = allFacilities;

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