import {
  createStation,
  deleteStation,
  getAdminStationsPaginated,
  updateStation,
  type StationEditItem,
} from "../db/stations";

import {
  getAvailableTopPicksForStation,
  getStationTopPicks,
  getTopPicks,
  type StationTopPick,
  type TopPick,
} from "../db/top-picks";

import { getLines } from "../db/lines";
import { saveRestaurantsNote } from "../db/places";
import { iconBucket } from "../storage/facility-icons";
import {
  checkStationImage,
  deleteStationImage,
  readStationImageFile,
  saveStationImage,
} from "../storage/station-images";

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
  topPicks: TopPick[];
}

export interface StationEditResult extends StationFormBase {
  stationTopPicks: StationTopPick[];
  availableTopPicks: TopPick[];
  stationExits: StationExit[];
  restaurantsNote?: string;
  restaurantsNoteJapanese?: string;
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

  return {
    values,
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
  topPickIds: number[],
  allTopPicks: TopPick[],
): StationFormErrors {
  const errors = validateStationForm(values);

  const validTopPickIds = new Set(allTopPicks.map((item) => item.id));

  if (topPickIds.some((itemId) => !validTopPickIds.has(itemId))) {
    errors.topPicks = "One or more selected top picks are invalid.";
  }

  return errors;
}

function toStationInput(values: StationFormValues, topPickIds: number[] | undefined) {
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
    topPicks,
  };

  if (request.method !== "POST") return result;

  const formData = await request.formData();
  const image = await readMainImage(formData);

  const { values, topPickIds } = readStationForm(formData);

  result.values = values;

  result.errors = validateStationSelections(values, topPickIds, topPicks);

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
      ...toStationInput(values, topPickIds),
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

  const { values, topPickIds, topPickIdsManaged } = readStationForm(formData);

  const allTopPicks = await getTopPicks(db);

  result.values = values;
  const noteEn = String(formData.get("restaurants_note") ?? "").trim();
  const noteJa = String(
    formData.get("restaurants_note_japanese") ?? "",
  ).trim();
  result.restaurantsNote = noteEn;
  result.restaurantsNoteJapanese = noteJa;

  result.errors = validateStationSelections(values, topPickIds, allTopPicks);

  if (noteEn.length > 1000 || noteJa.length > 1000) {
    result.formError = "The restaurants note must be 1000 characters or less.";
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
        ...toStationInput(values, topPickIdsManaged ? topPickIds : undefined),
        mainImage,
      });

      // The old file goes only after the new one is saved.
      if (mainImage !== undefined) {
        await deleteStationImage(bucket, station.main_image);
      }

      if (formData.has("restaurants_note")) {
        await saveRestaurantsNote(db, id, noteEn || null, noteJa || null);
      }

      result.redirectTo = `/admin/stations/${id}/edit?g=details&saved=1`;
      return result;
    } catch (err) {
      console.error(err);
      await deleteStationImage(bucket, uploadedKey);
      result.formError =
        "Unable to update the station. Please check the submitted values and try again.";
    }
  }

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
