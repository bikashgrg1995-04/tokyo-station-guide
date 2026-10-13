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
  createStationExit,
  deleteStationExit,
  getStationExits,
  updateStationExit,
  type StationExit,
  type StationExitInput,
} from "../db/station-exits";

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
const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{6})$/;

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
  stationExits: StationExit[];
}

interface ParsedStationFacilities {
  entries: StationFacilityInput[];
  error: string | null;
}

interface ParsedStationExits {
  entries: Array<StationExitInput & { id: number | null }>;
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
 * Reads the selected exit IDs from one facility row.
 */
function readFacilityExitIds(
  rawValue: FormDataEntryValue | undefined,
  rowNumber: number,
  errors: string[],
): number[] {
  const raw = String(rawValue ?? "").trim();

  if (!raw || raw === "[]") {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (
      !Array.isArray(parsed) ||
      parsed.some(
        (value) =>
          typeof value !== "number" ||
          !Number.isInteger(value) ||
          value <= 0,
      )
    ) {
      errors.push(
        `Facility row ${rowNumber}: selected exits contain invalid IDs.`,
      );
      return [];
    }

    return [...new Set(parsed as number[])];
  } catch {
    errors.push(
      `Facility row ${rowNumber}: selected exits could not be read.`,
    );
    return [];
  }
}

/**
 * Reads repeated floor-wise facility fields in matching order.
 * Each facility row also submits its selected exit IDs as JSON.
 */
function readStationFacilities(
  formData: FormData,
): ParsedStationFacilities {
  const facilityIds = formData.getAll("facility_entry_facility_id");
  const floorIds = formData.getAll("facility_entry_floor_id");
  const counts = formData.getAll("facility_entry_count");
  const notes = formData.getAll("facility_entry_note");
  const exitIdsJson = formData.getAll(
    "facility_entry_exit_ids_json",
  );

  const entries: StationFacilityInput[] = [];
  const errors: string[] = [];

  const rowCount = Math.max(
    facilityIds.length,
    floorIds.length,
    counts.length,
    notes.length,
    exitIdsJson.length,
  );

  for (let index = 0; index < rowCount; index += 1) {
    const rawFacilityId = String(facilityIds[index] ?? "").trim();
    const rawFloorId = String(floorIds[index] ?? "").trim();
    const rawCount = String(counts[index] ?? "").trim();
    const note = String(notes[index] ?? "").trim();

    const exitIds = readFacilityExitIds(
      exitIdsJson[index],
      index + 1,
      errors,
    );

    if (
      !rawFacilityId &&
      !rawFloorId &&
      !rawCount &&
      !note &&
      (!String(exitIdsJson[index] ?? "").trim() ||
        String(exitIdsJson[index]).trim() === "[]")
    ) {
      continue;
    }

    const facilityId = Number(rawFacilityId);
    const floorId = Number(rawFloorId);
    const facilityCount = Number(rawCount);

    if (!Number.isInteger(facilityId) || facilityId <= 0) {
      errors.push(`Facility row ${index + 1}: select a valid facility.`);
      continue;
    }

    if (!Number.isInteger(floorId) || floorId <= 0) {
      errors.push(`Facility row ${index + 1}: select a valid floor.`);
      continue;
    }

    if (
      !rawCount ||
      !Number.isInteger(facilityCount) ||
      facilityCount < 1
    ) {
      errors.push(
        `Facility row ${index + 1}: quantity must be a whole number of at least 1.`,
      );
      continue;
    }

    entries.push({
      facilityId,
      floorId,
      facilityCount,
      note: note || null,
      exitIds,
    });
  }

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
    error: errors[0] ?? null,
  };
}

/**
 * Reads exit rows submitted by the admin form.
 */
function readStationExits(formData: FormData): ParsedStationExits {
  const ids = formData.getAll("exit_entry_id");
  const floorIds = formData.getAll("exit_entry_floor_id");
  const names = formData.getAll("exit_entry_name");
  const codes = formData.getAll("exit_entry_code");
  const descriptions = formData.getAll("exit_entry_description");
  const colors = formData.getAll("exit_entry_color_code");
  const sortOrders = formData.getAll("exit_entry_sort_order");

  const entries: ParsedStationExits["entries"] = [];
  const errors: string[] = [];

  const rowCount = Math.max(
    ids.length,
    floorIds.length,
    names.length,
    codes.length,
    descriptions.length,
    colors.length,
    sortOrders.length,
  );

  for (let index = 0; index < rowCount; index += 1) {
    const rawId = String(ids[index] ?? "").trim();
    const rawFloorId = String(floorIds[index] ?? "").trim();
    const name = String(names[index] ?? "").trim();
    const code = String(codes[index] ?? "").trim();
    const description = String(descriptions[index] ?? "").trim();
    const colorCode = String(colors[index] ?? "").trim();
    const rawSortOrder = String(sortOrders[index] ?? "").trim();

    if (
      !rawId &&
      !rawFloorId &&
      !name &&
      !code &&
      !description &&
      !colorCode &&
      !rawSortOrder
    ) {
      continue;
    }

    const id = rawId ? Number(rawId) : null;
    const floorId = Number(rawFloorId);
    const sortOrder = rawSortOrder ? Number(rawSortOrder) : index + 1;

    if (id !== null && (!Number.isInteger(id) || id <= 0)) {
      errors.push(`Exit row ${index + 1}: invalid exit ID.`);
      continue;
    }

    if (!Number.isInteger(floorId) || floorId <= 0) {
      errors.push(`Exit row ${index + 1}: select a valid floor.`);
      continue;
    }

    if (!name) {
      errors.push(`Exit row ${index + 1}: exit name is required.`);
      continue;
    }

    if (colorCode && !HEX_COLOR_REGEX.test(colorCode)) {
      errors.push(
        `Exit row ${index + 1}: color must be a HEX value such as #E53935.`,
      );
      continue;
    }

    if (!Number.isInteger(sortOrder) || sortOrder < 0) {
      errors.push(
        `Exit row ${index + 1}: sort order must be a non-negative whole number.`,
      );
      continue;
    }

    entries.push({
      id,
      floorId,
      name,
      code: code || null,
      description: description || null,
      colorCode: colorCode || null,
      sortOrder,
    });
  }

  const seenIds = new Set<number>();

  for (const entry of entries) {
    if (entry.id === null) continue;

    if (seenIds.has(entry.id)) {
      errors.push(`Exit ID ${entry.id} was submitted more than once.`);
    }

    seenIds.add(entry.id);
  }

  return {
    entries,
    error: errors[0] ?? null,
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
  const parsedExits = readStationExits(formData);

  return {
    values,
    facilityIds: readIds(formData, "facility_ids"),
    stationFacilities: parsedFacilities.entries,
    stationFacilitiesError: parsedFacilities.error,
    stationExits: parsedExits.entries,
    stationExitsError: parsedExits.error,
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

  if (selectedFacilityIds.some((itemId) => !validFacilityIds.has(itemId))) {
    errors.facilities = "One or more selected facilities are invalid.";
  }

  if (topPickIds.some((itemId) => !validTopPickIds.has(itemId))) {
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

  if (request.method !== "POST") return result;

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

  if (stationFacilities.length > 0 || facilityIds.length > 0) {
    result.errors.facilities =
      "Create the station first, then add floors and assign facilities from Edit Station.";
  }

  if (hasErrors(result.errors)) return result;

  try {
    await createStation(db, toStationInput(values, [], topPickIds, []));
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
    stationExits: await getStationExits(db, id),
  };

  if (request.method !== "POST") return result;

  const formData = await request.formData();

  if (String(formData.get("action") ?? "") !== "update") {
    return result;
  }

  // Only synchronize exits when the exits panel submits its marker.
  const exitsEnabled = formData.get("station_exits_enabled") === "1";

  const {
    values,
    facilityIds,
    stationFacilities,
    stationFacilitiesError,
    stationExits,
    stationExitsError,
    topPickIds,
  } = readStationForm(formData);

  const allFacilities = await getFacilities(db);
  const allTopPicks = await getTopPicks(db);
  const stationFloors = await getStationFloors(db, id);
  const validFloorIds = new Set(stationFloors.map((floor) => floor.id));
  const existingExits = await getStationExits(db, id);
  const existingExitIds = new Set(existingExits.map((exit) => exit.id));

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

  // Facility assignments may only reference exits belonging to this station.
  const invalidFacilityExitSelection = stationFacilities.some((entry) =>
    (entry.exitIds ?? []).some((exitId) => !existingExitIds.has(exitId)),
  );

  if (invalidFacilityExitSelection) {
    result.errors.facilities =
      "One or more selected exits do not belong to this station.";
  }

  if (exitsEnabled) {
    if (stationExitsError) {
      result.formError = stationExitsError;
    }

    if (stationExits.some((entry) => !validFloorIds.has(entry.floorId))) {
      result.formError =
        "One or more selected exit floors do not belong to this station.";
    }

    if (
      stationExits.some(
        (entry) => entry.id !== null && !existingExitIds.has(entry.id),
      )
    ) {
      result.formError =
        "One or more submitted exits do not belong to this station.";
    }
  }

  if (!hasErrors(result.errors) && !result.formError) {
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

      if (exitsEnabled) {
        for (const entry of stationExits) {
          const { id: exitId, ...exitInput } = entry;

          if (exitId === null) {
            await createStationExit(db, id, exitInput);
          } else {
            await updateStationExit(db, id, exitId, exitInput);
          }
        }

        const submittedExitIds = new Set(
          stationExits
            .map((entry) => entry.id)
            .filter((exitId): exitId is number => exitId !== null),
        );

        for (const existingExit of existingExits) {
          if (!submittedExitIds.has(existingExit.id)) {
            await deleteStationExit(db, id, existingExit.id);
          }
        }
      }

      result.redirectTo = LIST_PATH;
      return result;
    } catch (err) {
      console.error(err);
      result.formError =
        "Unable to update station or exits. Please check the submitted values and try again.";
    }
  }

  // Preserve submitted facility rows and selected exits after validation errors.
  result.stationFacilities = stationFacilities.map((entry) => {
    const facility = allFacilities.find(
      (item) => item.id === entry.facilityId,
    );
    const floor = stationFloors.find((item) => item.id === entry.floorId);

    const selectedExits = (entry.exitIds ?? []).flatMap((exitId) => {
      const exit = existingExits.find((item) => item.id === exitId);

      if (!exit) return [];

      const exitFloor = stationFloors.find(
        (item) => item.id === exit.floor_id,
      );

      return [
        {
          id: exit.id,
          name: exit.name,
          code: exit.code,
          color_code: exit.color_code,
          floor_id: exit.floor_id,
          floor_name: exitFloor?.name ?? "Unknown floor",
          floor_name_japanese: exitFloor?.name_japanese ?? null,
        },
      ];
    });

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
      exits: selectedExits,
    };
  });

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

  // If the exits panel was not submitted, retain database exits unchanged.
  if (!exitsEnabled) {
    result.stationExits = existingExits;
  } else {
    result.stationExits = stationExits.map((entry) => {
      const existing =
        entry.id === null
          ? null
          : existingExits.find((exit) => exit.id === entry.id);

      return {
        id: entry.id ?? 0,
        station_id: id,
        floor_id: entry.floorId,
        name: entry.name,
        code: entry.code ?? null,
        description: entry.description ?? null,
        color_code: entry.colorCode ?? null,
        sort_order: entry.sortOrder ?? 0,
        created_at: existing?.created_at ?? "",
        updated_at: existing?.updated_at ?? "",
      };
    });
  }

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