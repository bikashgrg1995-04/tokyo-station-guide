import {
  assignPlace,
  createPlace,
  deletePlace,
  getPlaceById,
  getPlaceStationAssignments,
  getPlacesPaginated,
  hasPlaceAssignments,
  unassignPlace,
  updatePlace,
  type Place,
  type PlaceInput,
  type PlaceKindInfo,
  type StationPlace,
} from "../db/places";
import { iconBucket } from "../storage/facility-icons";
import {
  checkStationImage,
  deleteStationImage,
  readStationImageFile,
  saveStationImage,
} from "../storage/station-images";
import { isUniqueViolation, paginationUrlFor, readListQuery, readText } from "./common";

const PER_PAGE = 10;
const listPath = (k: PlaceKindInfo) => `/admin/${k.route}`;

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const validUrl = (v: string) => {
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
};

/* ---- list ---- */

export async function loadPlaceList(db: D1Database, k: PlaceKindInfo, url: URL) {
  const { search, page } = readListQuery(url);
  const r = await getPlacesPaginated(db, k, { page, perPage: PER_PAGE, search });
  return {
    ...r,
    perPage: PER_PAGE,
    searchParam: search,
    paginationUrl: paginationUrlFor(listPath(k), url, search),
  };
}

export async function handlePlaceDelete(request: Request, db: D1Database, k: PlaceKindInfo, rawId: string | undefined, env: unknown) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0 || request.method !== "POST") return listPath(k);
  try {
    if (await hasPlaceAssignments(db, k, id)) return `${listPath(k)}?error=assigned`;
    const existing = await getPlaceById(db, k, id);
    await deletePlace(db, k, id);
    await deleteStationImage(iconBucket(env as never), existing?.photo);
    return listPath(k);
  } catch (err) {
    console.error(`Failed to delete ${k.kind}:`, err);
    return `${listPath(k)}?error=delete`;
  }
}

/* ---- create / edit form ---- */

export interface PlaceFormValues {
  slug: string;
  name: string;
  nameJapanese: string;
  kind: string;
  kindJapanese: string;
  description: string;
  descriptionJapanese: string;
  mapUrl: string;
  bookingUrl: string;
}

export interface PlaceFormResult {
  redirectTo: string | null;
  place: Place | null;
  values: PlaceFormValues;
  formError: string;
}

const emptyValues = (): PlaceFormValues => ({
  slug: "", name: "", nameJapanese: "", kind: "", kindJapanese: "", description: "", descriptionJapanese: "",
  mapUrl: "", bookingUrl: "",
});

export async function handlePlaceForm(
  request: Request,
  db: D1Database,
  k: PlaceKindInfo,
  rawId: string | undefined,
  env: unknown,
): Promise<PlaceFormResult> {
  const id = rawId === undefined ? null : Number(rawId);
  const place = id !== null && Number.isInteger(id) && id > 0 ? await getPlaceById(db, k, id) : null;
  const result: PlaceFormResult = { redirectTo: null, place, values: emptyValues(), formError: "" };

  if (id !== null && !place) {
    result.redirectTo = listPath(k);
    return result;
  }
  if (place) {
    result.values = {
      slug: place.slug, name: place.name, nameJapanese: place.name_japanese ?? "", kind: place.kind ?? "",
      kindJapanese: place.kind_japanese ?? "", description: place.description ?? "",
      descriptionJapanese: place.description_japanese ?? "", mapUrl: place.map_url ?? "", bookingUrl: place.booking_url ?? "",
    };
  }
  if (request.method !== "POST") return result;

  const fd = await request.formData();
  const v: PlaceFormValues = {
    slug: readText(fd, "slug").toLowerCase(),
    name: readText(fd, "name"),
    nameJapanese: readText(fd, "name_japanese"),
    kind: readText(fd, "kind"),
    kindJapanese: readText(fd, "kind_japanese"),
    description: readText(fd, "description"),
    descriptionJapanese: readText(fd, "description_japanese"),
    mapUrl: readText(fd, "map_url"),
    bookingUrl: k.hasBooking ? readText(fd, "booking_url") : "",
  };
  result.values = v;

  const slug = v.slug || slugify(v.name);
  const fail = (m: string) => {
    result.formError = m;
    return result;
  };
  if (!v.name) return fail("The name is required.");
  if (v.name.length > 150 || v.nameJapanese.length > 150) return fail("The name must be 150 characters or less.");
  if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return fail("The slug can only have lowercase letters, numbers and hyphens.");
  if (v.kind.length > 80 || v.kindJapanese.length > 80) return fail("The kind must be 80 characters or less.");
  if (v.description.length > 800 || v.descriptionJapanese.length > 800) return fail("The description must be 800 characters or less.");
  for (const url of [v.mapUrl, v.bookingUrl]) {
    if (url && (!validUrl(url) || url.length > 500)) return fail("Links must be valid http(s) links of 500 characters or less.");
  }

  const file = readStationImageFile(fd, "photo_file");
  const check = file ? await checkStationImage(file) : null;
  if (check && !check.ok) return fail(check.error);

  const bucket = iconBucket(env as never);
  let uploaded: string | null = null;
  const input: PlaceInput = {
    slug,
    name: v.name,
    nameJapanese: v.nameJapanese || null,
    kind: v.kind || null,
    kindJapanese: v.kindJapanese || null,
    description: v.description || null,
    descriptionJapanese: v.descriptionJapanese || null,
    mapUrl: v.mapUrl || null,
    bookingUrl: v.bookingUrl || null,
  };

  try {
    if (check?.ok) {
      if (!bucket) return fail("Image storage (R2) is not configured. Bind the ASSETS_BUCKET R2 bucket.");
      uploaded = await saveStationImage(bucket, slug, check);
      input.photo = uploaded;
    } else if (place && fd.get("remove_photo") === "on") {
      input.photo = null;
    }

    if (place) {
      await updatePlace(db, k, place.id, input);
      if (input.photo !== undefined) await deleteStationImage(bucket, place.photo);
    } else {
      await createPlace(db, k, input);
    }
    result.redirectTo = listPath(k);
  } catch (err) {
    await deleteStationImage(bucket, uploaded);
    const msg = err instanceof Error ? err.message.toLowerCase() : "";
    result.formError = isUniqueViolation(msg, "slug")
      ? "This slug is already used. Choose another one."
      : "Unable to save. Please try again.";
  }
  return result;
}

/* ---- assigning to a station ---- */

/* ---- place-side station assignment page (like Top Pick → Stations) ---- */

export async function loadPlaceStationsPage(
  request: Request,
  url: URL,
  db: D1Database,
  k: PlaceKindInfo,
  placeId: number,
) {
  let error = "";
  let redirectTo: string | null = null;

  if (request.method === "POST") {
    const fd = await request.formData();
    const action = readText(fd, "action");
    const stationId = Number(readText(fd, "station_id"));
    const location = readText(fd, "location");
    const locationJa = readText(fd, "location_japanese");
    const order = Number(readText(fd, "sort_order") || "0");

    if (!Number.isInteger(stationId) || stationId <= 0) {
      error = "Please select a valid station.";
    } else if (action === "save") {
      if (location.length > 200 || locationJa.length > 200) error = "The location must be 200 characters or less.";
      else if (!Number.isInteger(order) || order < 0) error = "Order must be a whole number, 0 or more.";
      else {
        try {
          const exists = await db.prepare(`SELECT 1 FROM stations WHERE id = ?`).bind(stationId).first();
          if (!exists) error = "Please select a valid station.";
          else {
            await assignPlace(db, k, stationId, placeId, {
              location: location || null, locationJapanese: locationJa || null, sortOrder: order,
            });
            redirectTo = `/admin/${k.route}/${placeId}/stations?success=save`;
          }
        } catch (e) {
          console.error("Failed to assign station:", e);
          error = "Unable to update the station assignment.";
        }
      }
    } else if (action === "remove") {
      try {
        await unassignPlace(db, k, stationId, placeId);
        redirectTo = `/admin/${k.route}/${placeId}/stations?success=remove`;
      } catch (e) {
        console.error("Failed to remove station:", e);
        error = "Unable to update the station assignment.";
      }
    } else {
      error = "Invalid assignment action.";
    }
  }

  const place = await getPlaceById(db, k, placeId);
  const assignments = await getPlaceStationAssignments(db, k, placeId);
  const stationsRes = await db
    .prepare(`SELECT id, name, name_japanese FROM stations ORDER BY name`)
    .all<{ id: number; name: string; name_japanese: string | null }>();
  const success = url.searchParams.get("success");

  return {
    redirectTo,
    error,
    place,
    assignments,
    stations: stationsRes.results ?? [],
    assignedStationIds: new Set(assignments.map((a) => a.station_id)),
    successMessage:
      success === "save" ? "Station assignment saved." : success === "remove" ? "Station removed." : "",
  };
}
