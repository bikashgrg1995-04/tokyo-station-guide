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

import { getLines } from "../db/lines";
import { iconBucket } from "../storage/facility-icons";
import {
  checkStationImage,
  deleteStationImage,
  readStationImageFile,
  saveStationImage,
} from "../storage/station-images";
import { getStationFloors } from "../db/station-floors";
import type { StationFacilityInput } from "../db/stations/types";

import { getStationExits, type StationExit } from "../db/station-exits";

import { hasErrors, paginationUrlFor, readListQuery, readText } from "./common";

import {
  type StationFormValues,
  type StationFormErrors,
  emptyStationErrors,
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
  stationExits: StationExit[];
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
          typeof value !== "number" || !Number.isInteger(value) || value <= 0,
      )
    ) {
      errors.push(
        `Facility row ${rowNumber}: selected exits contain invalid IDs.`,
      );
      return [];
    }

    return [...new Set(parsed as number[])];
  } catch {
    errors.push(`Facility row ${rowNumber}: selected exits could not be read.`);
    return [];
  }
}

/**
 * Reads repeated floor-wise facility fields in matching order.
 * Each facility row also submits its selected exit IDs as JSON.
 */
function readStationFacilities(formData: FormData): ParsedStationFacilities {
  const facilityIds = formData.getAll("facility_entry_facility_id");
  const floorIds = formData.getAll("facility_entry_floor_id");
  const counts = formData.getAll("facility_entry_count");
  const notes = formData.getAll("facility_entry_note");
  const notesJapanese = formData.getAll("facility_entry_note_japanese");
  const locations = formData.getAll("facility_entry_location");
  const exitIdsJson = formData.getAll("facility_entry_exit_ids_json");

  const entries: StationFacilityInput[] = [];
  const errors: string[] = [];

  const rowCount = Math.max(
    facilityIds.length,
    floorIds.length,
    counts.length,
    notes.length,
    notesJapanese.length,
    exitIdsJson.length,
  );

  for (let index = 0; index < rowCount; index += 1) {
    const rawFacilityId = String(facilityIds[index] ?? "").trim();
    const rawFloorId = String(floorIds[index] ?? "").trim();
    const rawCount = String(counts[index] ?? "").trim();
    const note = String(notes[index] ?? "").replace(/\s*\r?\n\s*/g, " ").trim();
    const noteJapanese = String(notesJapanese[index] ?? "").replace(/\s*\r?\n\s*/g, " ").trim();
    const locationType =
      String(locations[index] ?? "").trim() === "outside" ? "outside" : "inside";

    if (note.length > 150) {
      errors.push(
        `Facility row ${index + 1}: note must not exceed 150 characters.`,
      );
      continue;
    }

    if (noteJapanese.length > 150) {
      errors.push(
        `Facility row ${index + 1}: Japanese note must not exceed 150 characters.`,
      );
      continue;
    }

    const exitIds = readFacilityExitIds(exitIdsJson[index], index + 1, errors);

    if (
      !rawFacilityId &&
      !rawFloorId &&
      !rawCount &&
      !note &&
      !noteJapanese &&
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

    if (!rawCount || !Number.isInteger(facilityCount) || facilityCount < 1) {
      errors.push(
        `Facility row ${index + 1}: quantity must be a whole number of at least 1.`,
      );
      continue;
    }

    entries.push({
      facilityId,
      floorId,
      facilityCount,
      locationType,
      note: note || null,
      noteJapanese: noteJapanese || null,
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

function readStationForm(formData: FormData) {
  const values: StationFormValues = {
    name: readText(formData, "name"),
    nameJapanese: readText(formData, "name_japanese"),
    slug: readText(formData, "slug").toLowerCase(),
    locationUrl: readText(formData, "location_url"),
    description: readText(formData, "description"),
    descriptionJapanese: readText(formData, "description_japanese"),
    about: readText(formData, "about"),
    aboutJapanese: readText(formData, "about_japanese"),
    region: readText(formData, "region"),
    address: readText(formData, "address"),
    regionJapanese: readText(formData, "region_japanese"),
    addressJapanese: readText(formData, "address_japanese"),
    statLinesNote: readText(formData, "stat_lines_note"),
    statLinesNoteJapanese: readText(formData, "stat_lines_note_japanese"),
    statRidersValue: readText(formData, "stat_riders_value"),
    statRidersNote: readText(formData, "stat_riders_note"),
    statRidersNoteJapanese: readText(formData, "stat_riders_note_japanese"),
    statOpenedValue: readText(formData, "stat_opened_value"),
    statOpenedNote: readText(formData, "stat_opened_note"),
    statOpenedNoteJapanese: readText(formData, "stat_opened_note_japanese"),
    isVerified: formData.get("is_verified") === "on",
    verifiedAt: readText(formData, "verified_at"),
  };

  const parsedFacilities = readStationFacilities(formData);

  return {
    values,
    facilityIds: readIds(formData, "facility_ids"),
    stationFacilities: parsedFacilities.entries,
    stationFacilitiesError: parsedFacilities.error,
    topPickIds: readIds(formData, "top_pick_ids"),
    topPickIdsManaged: formData.has("top_pick_ids_managed"),
  };
}

/**
 * Main photo of the station page. Reads the optional upload / "remove" tick from
 * the form and checks the file. Nothing is written to R2 here.
 */
async function readMainImage(formData: FormData) {
  const file = readStationImageFile(formData, "main_image_file");
  const remove = formData.get("remove_main_image") === "on";
  const check = file ? await checkStationImage(file) : null;

  return { file, remove, check, error: check && !check.ok ? check.error : "" };
}

async function getBucket(): Promise<R2Bucket | undefined> {
  const { env } = await import("cloudflare:workers");

  return iconBucket(env);
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
  topPickIds: number[] | undefined,
  stationFacilities: StationFacilityInput[],
) {
  return {
    name: values.name,
    nameJapanese: values.nameJapanese || null,
    slug: values.slug,
    locationUrl: values.locationUrl || null,
    description: values.description || null,
    descriptionJapanese: values.descriptionJapanese || null,
    about: values.about || null,
    aboutJapanese: values.aboutJapanese || null,
    region: values.region || null,
    address: values.address || null,
    regionJapanese: values.regionJapanese || null,
    addressJapanese: values.addressJapanese || null,
    statLinesNote: values.statLinesNote || null,
    statLinesNoteJapanese: values.statLinesNoteJapanese || null,
    statRidersValue: values.statRidersValue || null,
    statRidersNote: values.statRidersNote || null,
    statRidersNoteJapanese: values.statRidersNoteJapanese || null,
    statOpenedValue: values.statOpenedValue || null,
    statOpenedNote: values.statOpenedNote || null,
    statOpenedNoteJapanese: values.statOpenedNoteJapanese || null,
    facilityIds,
    stationFacilities,
    topPickIds,
    isVerified: values.isVerified,
    verifiedAt: values.isVerified ? values.verifiedAt || null : null,
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
      locationUrl: "",
      description: "",
      descriptionJapanese: "",
      about: "",
      aboutJapanese: "",
      region: "",
      address: "",
      regionJapanese: "",
      addressJapanese: "",
      statLinesNote: "",
      statLinesNoteJapanese: "",
      statRidersValue: "",
      statRidersNote: "",
      statRidersNoteJapanese: "",
      statOpenedValue: "",
      statOpenedNote: "",
      statOpenedNoteJapanese: "",
      isVerified: false,
      verifiedAt: "",
    },
    errors: emptyStationErrors(),
    formError: "",
    facilities,
    topPicks,
  };

  if (request.method !== "POST") return result;

  const formData = await request.formData();
  const image = await readMainImage(formData);

  const {
    values,
    facilityIds,
    stationFacilities,
    stationFacilitiesError,
    topPickIds,
  } = readStationForm(formData);

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

  const bucket = image.check?.ok ? await getBucket() : undefined;

  if (image.error) {
    result.errors.mainImage = image.error;
  } else if (image.check?.ok && !bucket) {
    result.errors.mainImage =
      "Image storage (R2) is not configured. Bind the ASSETS_BUCKET R2 bucket.";
  }

  if (hasErrors(result.errors)) return result;

  let uploadedKey: string | null = null;

  try {
    if (bucket && image.check?.ok) {
      uploadedKey = await saveStationImage(bucket, values.slug, image.check);
    }

    await createStation(db, {
      ...toStationInput(values, [], topPickIds, []),
      mainImage: uploadedKey,
    });
    result.redirectTo = LIST_PATH;
  } catch (err) {
    console.error(err);
    await deleteStationImage(bucket, uploadedKey);
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
      locationUrl: station.location_url ?? "",
      description: station.description ?? "",
      descriptionJapanese: station.description_japanese ?? "",
      about: station.about ?? "",
      aboutJapanese: station.about_japanese ?? "",
      region: station.region ?? "",
      address: station.address ?? "",
      regionJapanese: station.region_japanese ?? "",
      addressJapanese: station.address_japanese ?? "",
      statLinesNote: station.stat_lines_note ?? "",
      statLinesNoteJapanese: station.stat_lines_note_japanese ?? "",
      statRidersValue: station.stat_riders_value ?? "",
      statRidersNote: station.stat_riders_note ?? "",
      statRidersNoteJapanese: station.stat_riders_note_japanese ?? "",
      statOpenedValue: station.stat_opened_value ?? "",
      statOpenedNote: station.stat_opened_note ?? "",
      statOpenedNoteJapanese: station.stat_opened_note_japanese ?? "",
      isVerified: station.is_verified === 1,
      verifiedAt: station.verified_at?.slice(0, 10) ?? "",
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

  const image = await readMainImage(formData);

  const {
    values,
    facilityIds,
    stationFacilities,
    stationFacilitiesError,
    topPickIds,
    topPickIdsManaged,
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

  const bucket = image.check?.ok || image.remove ? await getBucket() : undefined;

  if (image.error) {
    result.errors.mainImage = image.error;
  } else if (image.check?.ok && !bucket) {
    result.errors.mainImage =
      "Image storage (R2) is not configured. Bind the ASSETS_BUCKET R2 bucket.";
  }

  if (!hasErrors(result.errors) && !result.formError) {
    let uploadedKey: string | null = null;

    try {
      if (bucket && image.check?.ok) {
        uploadedKey = await saveStationImage(bucket, values.slug, image.check);
      }

      // undefined = keep the saved photo, null = remove it, a key = replace it.
      const mainImage = uploadedKey ?? (image.remove ? null : undefined);

      await updateStation(db, id, {
        ...toStationInput(
          values,
          facilityIds,
          topPickIdsManaged ? topPickIds : undefined,
          stationFacilities,
        ),
        mainImage,
      });

      // The old file goes only after the new one is saved.
      if (mainImage !== undefined) {
        await deleteStationImage(bucket, station.main_image);
      }

      result.redirectTo = LIST_PATH;
      return result;
    } catch (err) {
      console.error(err);
      await deleteStationImage(bucket, uploadedKey);
      result.formError =
        "Unable to update the station. Please check the submitted values and try again.";
    }
  }

  // Preserve submitted facility rows and selected exits after validation errors.
  result.stationFacilities = stationFacilities.map((entry) => {
    const facility = allFacilities.find((item) => item.id === entry.facilityId);
    const floor = stationFloors.find((item) => item.id === entry.floorId);

    const selectedExits = (entry.exitIds ?? []).flatMap((exitId) => {
      const exit = existingExits.find((item) => item.id === exitId);

      if (!exit) return [];

      const exitFloor = stationFloors.find((item) => item.id === exit.floor_id);

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
      note_japanese: entry.noteJapanese ?? null,
      location_type: entry.locationType === "outside" ? "outside" : "inside",
      exits: selectedExits,
    };
  });

  result.availableFacilities = allFacilities;

  result.stationTopPicks = topPickIds
    .map((topPickId, index): StationTopPick | null => {
      const topPick = allTopPicks.find((item) => item.id === topPickId);

      return topPick
        ? {
            ...topPick,
            sort_order: index + 1,
            walking_minutes: null,
            floor_id: null,
            floor_name: null,
            floor_name_japanese: null,
            exit_id: null,
            exit_name: null,
            exit_code: null,
            location_type: "outside",
          }
        : null;
    })
    .filter((item): item is StationTopPick => Boolean(item));

  result.availableTopPicks = allTopPicks.filter(
    (item) => !topPickIds.includes(item.id),
  );

  // Exits are managed on their own page; the picker keeps the saved ones.
  result.stationExits = existingExits;

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

  const parsedLine = Number(url.searchParams.get("line"));
  const lineId =
    Number.isInteger(parsedLine) && parsedLine > 0 ? parsedLine : 0;

  const [{ items, totalItems, currentPage, totalPages }, lines] =
    await Promise.all([
      getAdminStationsPaginated(db, {
        page,
        perPage: PER_PAGE,
        search,
        lineId,
      }),
      getLines(db),
    ]);

  const paginationUrl = paginationUrlFor(LIST_PATH, url, search);

  if (lineId) {
    paginationUrl.searchParams.set("line", String(lineId));
  }

  return {
    stations: items,
    totalItems,
    currentPage,
    totalPages,
    perPage: PER_PAGE,
    searchParam: search,
    lineId,
    lines: lines.map((line) => ({ id: line.id, name: line.name })),
    paginationUrl,
  };
}
